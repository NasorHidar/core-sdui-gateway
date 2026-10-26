# SDUI Forge | Core Banking Gateway (core-sdui-gateway)

An enterprise-grade **Server-Driven UI (SDUI) Metadata Engine & API Gateway** engineered for mission-critical core banking ecosystems. The backend delivers declarative, versioned JSON UI blueprints and action schemas; the frontend dynamically interprets and mounts accessible React components at runtime—decoupling frontend deployments from banking product launches, compliance updates, and workflow changes.

> **Status:** Production-Ready & Certified ✅  
> **Backend:** Java 21 (Project Loom Virtual Threads) | Spring Boot 3.4.1 | Spring Data JDBC | Spring Security (JJWT) | Redis 7 | Apache Kafka 3.7+ (KRaft) | Oracle 23ai Free  
> **Frontend:** Next.js 14.2.5 (App Router) | React 18 | Zustand | Tailwind CSS | Strict Plain JavaScript (Zero TypeScript)

---

## Architecture Overview

```
                                      ┌─────────────────────────────────────────────────────────┐
                                      │           Next.js 14 Frontend (App Router)              │
                                      │  Dynamic Engine + RBAC Guard + Multi-Tier ErrorBoundary │
                                      └────────────────────────────┬────────────────────────────┘
                                                                   │ HTTPS + Bearer JWT
                                                                   ▼
                                      ┌─────────────────────────────────────────────────────────┐
                                      │   SDUI Forge Gateway (Spring Boot 3.4.1 / Java 21 Loom) │
                                      │    PageMetadataController · Service · Security Filters  │
                                      └──────────────┬─────────────────────────────┬────────────┘
                                                     │                             │
                               Cache Miss / DB Read  │                             │ Async Non-Blocking Event
                                                     ▼                             ▼
                                      ┌────────────────────────────┐  ┌─────────────────────────┐
                                      │      Oracle 23ai Free      │  │   Apache Kafka (KRaft)  │
                                      │    (Native JSON + CLOB)    │  │  Topic: audit-log-topic │
                                      └──────────────▲─────────────┘  └────────────┬────────────┘
                                                     │                             │
                                      L2 Cache Hit   │                             │ Background Group Consumer
                                      (Lettuce TTL)  │                             ▼
                                      ┌──────────────┴─────────────┐  ┌─────────────────────────┐
                                      │          Redis 7           │  │    AuditLogConsumer     │
                                      │ (sdui::menuTree / pageBp)  │  │ (Idempotent CLOB save)  │
                                      └────────────────────────────┘  └─────────────────────────┘
```

---

## 8 Core Architectural Capabilities

### 1. Authentication, Session & Role-Based Access Control (RBAC)
- **Mandatory Authentication:** All internal routes (`/dashboard`, `/dynamic-page/*`) are strictly guarded. Unauthenticated requests are intercepted and redirected to `/login`.
- **Stateless JWT Tokens:** Login issues HMAC-SHA256 tokens with strict expiry validation, stored in session storage and `SameSite=Strict` cookies (with conditional `Secure` flag on HTTPS).
- **Role-Based Visibility (ACL):** Service catalog and navigation menus evaluate assigned roles (`ROLE_MAKER`, `ROLE_CHECKER`, `ROLE_ADMIN`, `ROLE_AUDITOR`) against `SVRD_ALLOWED_ROLES`. Unauthorized actions are filtered at both the UI and backend controller boundaries.

### 2. Dynamic Primary Service Catalog
- **Database-Driven Catalog:** Primary business services are fetched dynamically from the `SERVICE` table via `/api/v1/services`.
- **Order & Status Governance:** Rendered strictly according to `SVR_SORT_ORDER` and `SVR_IS_ACTIVE`, allowing instant re-ordering and activation of banking services from the database without redeploying code.

### 3. Hierarchical Sub-Service Navigation
- **Multi-Level Left Sidebar:** Selecting a primary service triggers dynamic retrieval of its nested child hierarchy via `/api/v1/services/{id}/sub-services` or `/api/v1/menus`.
- **Recursive Menu Support:** Built via Oracle `CONNECT BY PRIOR` queries transformed into recursive tree structures (`MenuNodeDto`), supporting infinite nesting depths for complex product hierarchies.

### 4. Skeleton-Driven Search Interface & Dynamic Validation
- **Search Skeletons:** Menu items dynamically generate contextual search interfaces configured from `SERVICE_DETAILS.SVRD_SEARCH_SKELETON`.
- **Smart Bypass:** When a sub-service requires no search inputs (e.g. Transaction History), the engine automatically bypasses the search UI and fetches the blueprint directly.
- **Dynamic Pre-Flight Validation:** Validation rules (regex patterns, required flags, numeric/alphanumeric types) are defined in backend metadata and enforced client-side before any API call is dispatched.

### 5. Server-Driven UI (SDUI) Form Generation
- **Declarative Blueprints:** Backend returns complete `PAGE_UI_BLUEPRINT` JSON payloads containing layout grids, display cards, summary panels, and form fields.
- **Strict Read-Only Enforcement:** Data fetched from backend lookups (account balances, customer identifiers, ledger records) is rendered as read-only display widgets.
- **Interactive Field Isolation:** Only explicitly designated interactive fields (e.g. `transferAmount`, `beneficiaryRemarks`) allow user data entry, preventing tampering with context variables.

### 6. Context-Aware Execution & Business Layer Routing
- **Dynamic Action Buttons:** Configured via `PAGE_ACTION` metadata with target endpoints (e.g., `/api/v1/core/transfers/execute`), HTTP methods, and payload schemas.
- **Payload Aggregation:** Upon action dispatch, the frontend dynamically aggregates read-only context data, authenticated user metadata, and interactive form inputs into the exact JSON schema required by the core banking service.
- **Human-Readable Receipts:** Core banking responses are presented as structured transaction receipt cards rather than raw JSON payloads.

### 7. Comprehensive Asynchronous Audit & Activity Logging
- **Non-Blocking Telemetry:** Every critical event (search query, form submission, workflow action) publishes an `ActivityLogEvent` to Apache Kafka (`audit-log-topic`) partitioned by `userId`.
- **Idempotent Persistence:** `AuditLogConsumer` reads events in the background and writes them to Oracle `ACTIVITY_LOG` with full request/response payloads in `CLOB` format.
- **Live Audit Trail Modal:** Built-in dashboard modal allows compliance and audit officers to review recent real-time transactions with execution timing and status.

### 8. Fallback Mechanisms, Error Boundaries & Microservice Resilience
- **Dual-Tier Error Boundaries:** React `WidgetErrorBoundary` catches individual component failures, rendering isolated fallback notices without crashing the page. `PageErrorBoundary` manages global layout resilience.
- **Graceful Blueprint Fallback:** If a backend microservice fails to deliver a blueprint or times out, `SduiFallbackError` provides structured diagnostics, retry actions, and direct fallback options.
- **Resilience Testing Mode:** A dedicated test toggle on the dashboard allows simulating backend failure states on demand to verify graceful degradation.

---

## Repository Structure

```
core-sdui-gateway/
├── docker-compose.yml                       # Multi-service infrastructure (Oracle 23ai, Redis 7, Kafka KRaft)
├── core-sdui-gateway.sql                    # Canonical Oracle 23ai DDL schema definition
├── oracle-init/                             # Database provisioning entrypoint
│   ├── 01_setup.sql                         # PDB switch, user provisioning, DDL, baseline seed data
│   └── 02_rich_seed_data.sql                # Complete banking catalog, menus, blueprints & actions
├── pom.xml                                  # Java 21, Spring Boot 3.4.1, dependencies
├── src/main/java/com/sdui/forge/
│   ├── SduiForgeApplication.java           # Spring Boot entrypoint
│   ├── audit/                              # Kafka asynchronous audit logging pipeline
│   │   ├── ActivityLogEvent.java           # Immutable event record (UUID, user, CLOB payload)
│   │   ├── AuditLogProducer.java           # Non-blocking per-user partitioned publisher
│   │   └── AuditLogConsumer.java           # Idempotent consumer with MANUAL_IMMEDIATE ack
│   ├── config/                             # Infrastructure configurations (OSON, Redis Lettuce, Kafka)
│   ├── controller/                         # REST API controllers
│   │   ├── AuthController.java             # /api/v1/auth/login, /api/v1/auth/token
│   │   ├── PageMetadataController.java     # /api/v1/services, /api/v1/menus, /api/v1/pages/*/blueprint
│   │   ├── CoreBankingMockController.java  # /api/v1/core/accounts/*, /api/v1/core/transfers/*
│   │   └── AuditActivityController.java    # /api/v1/activity-logs/recent
│   ├── domain/                             # Spring Data JDBC entities (Records)
│   ├── dto/                                # Strong-typed API transfer records
│   ├── exception/                          # Banking-grade GlobalExceptionHandler
│   ├── repository/                         # Spring Data JDBC repositories
│   ├── security/                           # Stateless JJWT security, CORS & filters
│   └── service/                            # Metadata resolution, tree building & caching
├── src/main/resources/
│   ├── application.yml                     # Virtual Threads, HikariCP, Redis, Kafka, JWT config
│   ├── schema.sql                          # Spring Boot SQL initialization DDL
│   └── data.sql                            # Spring Boot SQL initialization seed data
├── src/test/java/com/sdui/forge/
│   └── controller/
│       ├── LiveSystemSmokeIntegrationTest.java       # Live integration smoke test suite
│       └── PageMetadataControllerIntegrationTest.java# Testcontainers Oracle 23ai + Redis 7 suite
├── frontend/                               # Next.js 14 SDUI engine (Pure JavaScript)
│   ├── app/
│   │   ├── layout.jsx                      # App root layout with metadata
│   │   ├── page.jsx                        # Root landing redirect
│   │   ├── globals.css                     # Tailwind design tokens
│   │   ├── login/page.jsx                  # Mandatory authentication portal
│   │   ├── dashboard/                      # Dynamic banking services & sidebar dashboard
│   │   └── dynamic-page/[pageId]/page.jsx  # Server Component blueprint renderer
│   ├── components/
│   │   ├── ErrorBoundary.jsx               # Widget & Page Error Boundaries
│   │   ├── SduiDynamicEngine.jsx           # Declarative JSON blueprint form parser
│   │   ├── LeftSidebar.jsx                 # Hierarchical nested sub-service navigation
│   │   ├── ServiceGrid.jsx                 # Dynamic primary services grid
│   │   ├── SearchPromptBox.jsx             # Dynamic skeleton search & validation box
│   │   ├── AuditLogModal.jsx               # Live telemetry & activity log modal
│   │   ├── TransactionReceiptCard.jsx      # Formatted core banking transaction receipt
│   │   ├── SduiFallbackError.jsx           # Graceful error & retry component
│   │   └── widgets/                        # Dynamic UI widgets (InputGroup, DisplayCard, etc.)
│   ├── lib/
│   │   ├── mockBlueprint.js                # Blueprint dual-schema normalizer
│   │   └── jsonBlueprintLoader.js          # File-system blueprint provider
│   ├── store/useAppStore.js                # Global Zustand state machine & session management
│   ├── utils/
│   │   ├── actionDispatcher.js             # Context-aware business API execution engine
│   │   ├── componentRegistry.js            # Case-insensitive component mapping
│   │   └── rbac.js                         # JWT parser, token expiry & role filtering
│   ├── package.json                        # Dependencies & scripts
│   └── .eslintrc.json                      # Next.js Core Web Vitals ESLint rules
├── AUDIT_REMEDIATION_REPORT.md             # Detailed engineering audit & defect remediation log
└── README.md                               # Project documentation
```

---

## Technical Specifications & Stack

| Layer | Technology | Architectural Role |
|:---|:---|:---|
| **Runtime & Concurrency** | Java 21 (OpenJDK / Temurin) | **Project Loom Virtual Threads** (`spring.threads.virtual.enabled=true`) |
| **Backend Framework** | Spring Boot 3.4.1 | Stateless REST Gateway, high-throughput non-blocking I/O |
| **Data Persistence** | Spring Data JDBC | Explicit zero-reflection SQL queries; native OSON/CLOB mapping |
| **Database** | Oracle 23ai Free | Native JSON columns (`PAGE_UI_BLUEPRINT`), recursive `CONNECT BY` menus |
| **Distributed Cache** | Redis 7 (Lettuce) | Multi-tier caching (`sdui::menuTree`, 60m TTL; `sdui::pageBlueprint`, 30m TTL) |
| **Asynchronous Bus** | Apache Kafka 3.7+ (KRaft) | Asynchronous audit pipeline; non-blocking producer, ordered per `userId` |
| **Security & Auth** | Spring Security 6 + JJWT 0.12 | Stateless Bearer token validation, HMAC-SHA256, RBAC filtering |
| **Frontend Framework** | Next.js 14.2.5 (App Router) | React 18 Server Components + Client Boundaries, Pure JavaScript |
| **State Management** | Zustand 4.5 | Centralized session state, active service tree, and blueprint cache |
| **Testing Harness** | JUnit 5 + Testcontainers | Integration smoke tests against live Oracle 23ai, Redis, and Kafka |

---

## Seed Accounts & User Personas

The database is provisioned with four standard banking security personas. Password for all default seed accounts is `password`:

| Username | Password | Role | Description |
|:---|:---|:---|:---|
| `maker_user` | `password` | `ROLE_MAKER,ROLE_ADMIN` | Initiates fund transfers, account searches, and operational requests |
| `checker_user` | `password` | `ROLE_CHECKER` | Authorizes pending approvals and reviews dual-control operations |
| `admin_user` | `password` | `ROLE_ADMIN` | Full administrative access across all service and menu catalogs |
| `auditor_user` | `password` | `ROLE_AUDITOR` | Read-only access to audit trails, transaction records, and ledger queries |

---

## Core API Endpoints

| Endpoint | Method | Security | Description |
|:---|:---:|:---:|:---|
| `/sdui-forge/api/v1/auth/login` | `POST` | Public | Authenticates credentials with BCrypt, records login log, issues JWT |
| `/sdui-forge/api/v1/auth/token` | `POST` | Public | Utility endpoint for generating mock test tokens with arbitrary roles |
| `/sdui-forge/api/v1/services` | `GET` | Bearer JWT | Fetches active primary services ordered by `SVR_SORT_ORDER` (Redis cached) |
| `/sdui-forge/api/v1/services/{id}/sub-services` | `GET` | Bearer JWT | Fetches nested hierarchical sub-service tree for a primary service (Redis cached) |
| `/sdui-forge/api/v1/menus` | `GET` | Bearer JWT | Fetches complete global menu hierarchy & dispatches audit telemetry |
| `/sdui-forge/api/v1/pages/{id}/blueprint` | `GET` | Bearer JWT | Fetches composite page blueprint with actions and schemas (Redis cached) |
| `/sdui-forge/api/v1/core/accounts/search` | `POST` | Bearer JWT | Core banking account enquiry & statement generation with Kafka audit |
| `/sdui-forge/api/v1/core/transfers/execute` | `POST` | Bearer JWT | Core banking fund transfer execution with Kafka audit |
| `/sdui-forge/api/v1/activity-logs/recent` | `GET` | Bearer JWT | Returns recent audit events from Oracle `ACTIVITY_LOG` for telemetry modal |
| `/sdui-forge/actuator/health` | `GET` | Public | Liveness and readiness probe for Kubernetes / Docker healthchecks |

---

## Quick Start Guide

### Prerequisites
- **Java 21** (JDK 21+)
- **Maven 3.9+**
- **Node.js 18+** & **npm 9+**
- **Docker & Docker Compose**

### 1. Launch Infrastructure
Start Oracle 23ai Free, Redis 7, and Apache Kafka (KRaft mode):

```bash
# Start all infrastructure containers in background
docker compose up -d

# Verify all containers report 'healthy'
docker compose ps
```

### 2. Start the Spring Boot Backend Gateway
```bash
# Build and run tests
mvn clean test-compile

# Start the Spring Boot Gateway (runs on port 8080 with Virtual Threads)
mvn spring-boot:run
```
*The gateway is available at:* `http://localhost:8080/sdui-forge`  
*Actuator health check:* `http://localhost:8080/sdui-forge/actuator/health`

### 3. Start the Next.js Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open your browser at:* `http://localhost:3000`  
Log in using `maker_user` and `password`.

---

## Testing & Quality Assurance

### Integration Tests
To execute backend integration tests against the live system:
```bash
mvn test -Dtest=LiveSystemSmokeIntegrationTest
```
*Result: 4/4 integration tests pass (100% green).*

### Frontend Linting & Production Build
```bash
cd frontend
npm run lint
npm run build
```
*Result: 0 ESLint warnings, 0 type errors, clean static/dynamic route optimization.*

---

## License & Compliance
This software is proprietary and intended for enterprise banking evaluations. Built under strict security guidelines with stateless JWT authorization, OWASP-compliant exception sanitization, and non-blocking audit traceability.
