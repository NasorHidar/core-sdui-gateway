# SDUI Forge (core-sdui-gateway)

An enterprise-grade **Server-Driven UI (SDUI) Metadata Engine** engineered for core banking environments. The backend delivers declarative JSON UI blueprints; the frontend dynamically mounts React components at runtime—eliminating hardcoded client routing and decoupling frontend releases from banking product rollouts.

> **Status:** **Phase 5: Testing, Optimization, and Go-Live Preparation** — ✅ Complete  
> All phases (Core Database Architecture, Frontend Dynamic Engine, Interactivity, Security/Kafka/Redis, Integration Testing & Automated Infrastructure) are production-ready.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Next.js 14 Frontend (App Router)    │
                      │  SduiRenderer + WidgetErrorBoundary    │
                      └──────────────────┬─────────────────────┘
                                         │  HTTPS + Bearer JWT
                                         ▼
                      ┌────────────────────────────────────────┐
                      │       core-sdui-gateway (Spring Boot)  │
                      │       Java 21 (Virtual Threads Loom)   │
                      │   PageMetadataController / Service     │
                      └───────┬────────────────────┬───────────┘
                              │                    │
              Cache Miss / DB │                    │ Async Audit Log
                              ▼                    ▼
               ┌───────────────────────┐  ┌───────────────────────┐
               │     Oracle 23ai       │  │     Apache Kafka      │
               │ (Native OSON / CLOB)  │  │ (Per-user partitioned)│
               └───────────▲───────────┘  └───────────┬───────────┘
                           │                          │
                    Cache  │                          │ Background Consumer
                    Hit    │                          ▼
               ┌───────────┴───────────┐  ┌───────────────────────┐
               │        Redis 7        │  │     Audit Consumer    │
               │  (Lettuce, TTL 30m)   │  │ (Idempotent CLOB save)│
               └───────────────────────┘  └───────────────────────┘
```

---

## Project Status & Milestones

| Phase | Scope | Status | Key Deliverables |
|:---|:---|:---:|:---|
| **Phase 1** | Core DB & Backend Foundation | ✅ Complete | Spring Boot 3.4, Spring Data JDBC, Oracle 23ai schema, OSON converters |
| **Phase 2** | Frontend Engine & Dynamic Renderer | ✅ Complete | Next.js 14 App Router, `SduiRenderer`, Component Registry, Skeletons |
| **Phase 3** | Interactivity & Form Engine | ✅ Complete | Dynamic event bindings, React Hook Form, server-driven validators |
| **Phase 4** | Enterprise Security, Caching & Auditing| ✅ Complete | Stateless JJWT auth, Redis 7 cache, Kafka 3.7 non-blocking audit producer/consumer |
| **Phase 5** | Testing, Optimization & Go-Live Prep | ✅ Complete | Testcontainers integration suite, React Error Boundaries, HikariCP & ZGC tuning, Docker Compose automation |

---

## Repository Structure

```
core-sdui-gateway/
├── docker-compose.yml                       # Unified multi-service infrastructure (Oracle 23ai, Redis 7, Kafka KRaft)
├── core-sdui-gateway.sql                    # Canonical Oracle 23ai DDL schema definition
├── oracle-init/                             # Automated database provisioning container entrypoint
│   └── 01_setup.sql                         # PDB switch, user provisioning, DDL, and baseline seed data
├── pom.xml                                  # Spring Boot 3.4.1, Java 21, Testcontainers BOM
├── src/main/java/com/sdui/forge/
│   ├── SduiForgeApplication.java           # Spring Boot bootstrap
│   ├── audit/                              # Kafka asynchronous audit logging pipeline
│   │   ├── ActivityLogEvent.java           # Immutable event record (UUID, user, CLOB payload)
│   │   ├── AuditLogProducer.java           # Non-blocking per-user partitioned publisher
│   │   └── AuditLogConsumer.java           # Idempotent consumer with MANUAL_IMMEDIATE ack
│   ├── config/                             # Infrastructure configurations
│   │   ├── JdbcConfig.java                 # Oracle JSON (OSON) ↔ String converters
│   │   ├── RedisCacheConfig.java           # Lettuce cache manager, key prefixes, TTLs
│   │   └── KafkaConsumerConfig.java        # Dedicated ErrorHandlingDeserializer & DLT
│   ├── controller/                         # REST API endpoints
│   │   └── PageMetadataController.java     # /api/v1/pages/{id}/blueprint, /api/v1/menus
│   ├── domain/                             # Spring Data JDBC entities (Records)
│   │   ├── ServiceDetails.java
│   │   ├── PageTemplate.java
│   │   ├── PageAction.java
│   │   └── ActivityLog.java
│   ├── dto/                                # Strong-typed API transfer records
│   ├── exception/                          # GlobalExceptionHandler & banking error mappings
│   ├── repository/                         # Spring Data JDBC repositories
│   │   ├── ServiceDetailsRepository.java
│   │   ├── PageTemplateRepository.java
│   │   ├── PageActionRepository.java
│   │   └── ActivityLogRepository.java
│   ├── security/                           # Stateless security layer
│   │   ├── SecurityConfig.java             # Method security, CORS, filter chain
│   │   ├── JwtAuthenticationFilter.java    # Bearer token interceptor
│   │   ├── JwtAuthenticationEntryPoint.java# RFC 7807 compliant 401 error handler
│   │   └── JwtTokenProvider.java           # HMAC-SHA256 JJWT generator and validator
│   └── service/
│       └── PageMetadataService.java        # Blueprint retrieval, caching & JSON parsing
├── src/main/resources/
│   ├── application.yml                     # Virtual Threads, HikariCP, Redis, Kafka, JWT config
│   ├── schema.sql                          # Spring Boot SQL initialization DDL
│   ├── data.sql                            # Spring Boot SQL initialization seed data
│   └── db/migration/
│       ├── V1__core_schema.sql             # Flyway migration: core tables
│       └── V2__activity_log.sql            # Flyway migration: audit table
├── src/test/java/com/sdui/forge/
│   └── controller/
│       └── PageMetadataControllerIntegrationTest.java # Testcontainers Oracle 23ai + Redis 7 suite
├── frontend/                               # Next.js 14 SDUI engine
│   ├── app/
│   │   ├── layout.jsx                      # App root layout with navigation bar
│   │   ├── page.jsx                        # Root landing redirect to /dynamic-page/101
│   │   ├── globals.css
│   │   └── dynamic-page/[pageId]/page.jsx  # Server Component blueprint loader + PageErrorBoundary
│   ├── components/
│   │   ├── ErrorBoundary.jsx               # Widget-level & Page-level Error Boundaries
│   │   ├── SduiRenderer.jsx                # Recursive component tree renderer with WidgetErrorBoundary
│   │   └── skeletons/                      # Banking UI widgets
│   │       ├── SkeletonCard.jsx
│   │       ├── SkeletonForm.jsx
│   │       ├── SkeletonGrid.jsx
│   │       └── UnknownComponent.jsx        # Fallback for unmapped widgets
│   ├── lib/mockBlueprint.js                # Blueprint mocks & adapters (Pages #1, #101, #999)
│   ├── utils/componentRegistry.js          # Dynamic component resolver with alias support
│   ├── package.json
│   ├── next.config.mjs
│   ├── postcss.config.mjs
│   └── tailwind.config.js
├── graphify-out/                           # AST and Semantic Architecture Knowledge Graph
├── phase1_deliverables.md                  # Phase 1 DDL, REST APIs, JSON data contracts
├── phase2_deliverables.md                  # Phase 2 Next.js dynamic engine specs
├── phase4_deliverables.md                  # Phase 4 Security, Caching, and Kafka audit details
├── phase5_deliverables.md                  # Phase 5 Testcontainers, ErrorBoundary, JVM, JMeter
└── README.md
```

---

## Technical Specifications & Constraints

| Layer | Technology | Key Architectural Details |
|:---|:---|:---|
| **Runtime & Concurrency** | Java 21 (OpenJDK / Temurin) | **Project Loom Virtual Threads** enabled (`spring.threads.virtual.enabled=true`) |
| **Backend Framework** | Spring Boot 3.4.1 | Stateless REST gateway, MVC on virtual threads |
| **Data Persistence** | Spring Data JDBC | Explicit queries without Hibernate overhead; direct OSON binding |
| **Database** | Oracle 23ai | Native JSON columns (`CHECK (PAGE_UI_BLUEPRINT IS JSON)`), CLOB audit payloads |
| **Distributed Cache** | Redis 7 (Lettuce) | Multi-tier caching (`sdui::pageBlueprint`, 30m TTL; `sdui::menuTree`, 60m TTL) |
| **Asynchronous Bus** | Apache Kafka 3.7+ (KRaft) | Audit trail decoupling; non-blocking sends, ordered per `userId` partition |
| **Security & Auth** | Spring Security + JJWT 0.12 | Stateless Bearer token validation, HMAC-SHA256 signing, RBAC (`MAKER`, `CHECKER`) |
| **Frontend Runtime** | Next.js 14 (App Router) | React 18 Server Components + Client Boundaries, Pure JavaScript (No TS) |
| **Resilience & Testing** | JUnit 5 + Testcontainers | Real Oracle 23ai and Redis 7 containerized verification |

---

## Database Architecture (`core-sdui-gateway.sql`)

The database architecture is defined in [`core-sdui-gateway.sql`](file:///f:/Research/core-sdui-gateway/core-sdui-gateway.sql) and implemented in [`oracle-init/01_setup.sql`](file:///f:/Research/core-sdui-gateway/oracle-init/01_setup.sql).

### Core Tables

1. **`USERS`:** Authentication records, password hashes (BCrypt), session tokens, and active flags.
2. **`SERVICE`:** Root service catalog (e.g., Retail Core Banking, Corporate & Treasury).
3. **`SERVICE_DETAILS`:** Hierarchical navigation menu tree with self-referencing foreign keys (`SVRD_PARENT_MENU_ID`), assigned roles (`SVRD_ALLOWED_ROLES`), and foreign key linkage to `PAGE_TEMPLATE`.
4. **`PAGE_TEMPLATE`:** Server-driven UI definitions. Stores layout type and the full JSON component tree (`PAGE_UI_BLUEPRINT`) in Oracle 23ai native JSON format.
5. **`PAGE_ACTION`:** Interactive events and API bindings linked to menu nodes (Search API, Fund Transfer Submit, Approval).
6. **`BUSINESS_LOGIC_CONFIG`:** Extension point mapping actions to backend handler identifiers and execution parameters.
7. **`LOGIN_LOG`:** Session and client audit tracking (IP address, user agent, status).
8. **`ACTIVITY_LOG`:** Asynchronous transaction audit trail populated via Kafka; stores full request/response payloads in `CLOB` with indexed business reference keys (`ALOG_REFERENCE_KEY`).

---

## Infrastructure: Docker Compose (`docker-compose.yml`)

The repository includes a production-mirror [`docker-compose.yml`](file:///f:/Research/core-sdui-gateway/docker-compose.yml) defining all core infrastructure components with container healthchecks, persistent volumes, and zero ZooKeeper dependencies:

| Service | Container Name | Image | Port | Description & Config |
|:---|:---|:---|:---:|:---|
| `oracle23ai` | `sdui-oracle` | `container-registry.oracle.com/database/free:latest` | `1521` | Oracle 23ai Free Database (PDB: `FREEPDB1`). Auto-initializes schema via `./oracle-init:/container-entrypoint-initdb.d`. |
| `redis` | `sdui-redis` | `redis:7-alpine` | `6379` | Redis L2 Distributed Cache with AOF persistence (`--appendonly yes`). |
| `kafka` | `sdui-kafka` | `bitnami/kafka:latest` | `9092` | Apache Kafka in KRaft mode (controller + broker combined, no ZooKeeper). |

### Automated Container Initialization:
* **Oracle 23ai:** The container mounts `./oracle-init:/container-entrypoint-initdb.d`. Upon initial startup, it switches to `FREEPDB1`, provisions the `sdui_admin` user (`sdui_secret`), executes the full DDL, and inserts baseline seed data.
* **Healthchecks:**
  * **Oracle:** Evaluates `healthcheck.sh` (30s interval, 10s timeout, 5 retries).
  * **Redis:** Evaluates `redis-cli ping` (10s interval, 5s timeout, 3 retries).
  * **Kafka:** Evaluates `kafka-topics.sh --list --bootstrap-server localhost:9092` (15s interval, 10s timeout, 5 retries).

---

## Quick Start Guide

### 1. Start Infrastructure via Docker Compose

Spin up Oracle 23ai, Redis 7, and Kafka KRaft in the background:

```bash
# Start all infrastructure containers
docker compose up -d

# Verify container status and healthcheck results
docker compose ps
```

*Expected status:*
```
NAME          IMAGE                                               COMMAND                  SERVICE      STATUS
sdui-kafka    bitnami/kafka:latest                                "/opt/bitnami/script…"   kafka        running (healthy)
sdui-oracle   container-registry.oracle.com/database/free:latest   "/bin/bash -c $ORACL…"   oracle23ai   running (healthy)
sdui-redis    redis:7-alpine                                      "docker-entrypoint.s…"   redis        running (healthy)
```

To view logs or tear down the stack:
```bash
# View aggregated service logs
docker compose logs -f

# Stop containers (preserves volume data)
docker compose down

# Stop containers and purge volumes (fresh restart)
docker compose down -v
```

### 2. Backend Gateway Launch

Ensure your environment connects to the initialized Oracle database (`sdui_admin` / `sdui_secret`):

```bash
# Build and verify test suite compilation
mvn clean test-compile

# Start the Spring Boot Gateway (runs with Virtual Threads on port 8080)
mvn spring-boot:run
# Gateway is accessible at http://localhost:8080/sdui-forge
```

*Default Configuration (from `application.yml`):*
```yaml
spring:
  datasource:
    url: jdbc:oracle:thin:@//localhost:1521/FREEPDB1
    username: sdui_admin
    password: sdui_secret
  data:
    redis:
      host: localhost
      port: 6379
  kafka:
    bootstrap-servers: localhost:9092
```

### 3. Frontend Dynamic Renderer Launch

```bash
cd frontend
npm install
npm run dev
# Portal accessible at http://localhost:3000 (auto-redirects to /dynamic-page/101)
```

Direct URLs available out-of-the-box:
* **Primary Dashboard:** `http://localhost:3000/dynamic-page/101`
* **Account Overview:** `http://localhost:3000/dynamic-page/1`
* **Error Boundary Fallback Demo:** `http://localhost:3000/dynamic-page/999`

---

## Phase 5 Highlights: Production Readiness & Quality Assurance

### 1. Testcontainers Integration Suite
The test harness ([`PageMetadataControllerIntegrationTest.java`](file:///f:/Research/core-sdui-gateway/src/test/java/com/sdui/forge/controller/PageMetadataControllerIntegrationTest.java)) executes full-cycle integration tests using real, containerized dependencies:
* **Oracle 23ai Container (`gvenzl/oracle-free:23-slim-faststart`):** Verifies real SQL dialect, JSON-parsing constraints, and DDL migrations.
* **Redis 7 Container (`redis:7-alpine`):** Validates cache misses, cache hits, key namespace creation, and TTL eviction policies.
* **Wire Authentication:** Out-of-process `TestRestTemplate` calls pass authentic JWT tokens generated by `JwtTokenProvider`, testing real filter chain execution.
* **Cache Integrity:** Verifies that 404 responses are rejected by Redis and never poisoned into cache.

```bash
# Execute integration test suite with active Docker daemon
mvn test -Dtest=PageMetadataControllerIntegrationTest
```

### 2. Frontend Edge-Case Safety (`ErrorBoundary.jsx`)
In a JavaScript-based frontend, malformed backend JSON or breaking schema changes can cause fatal client errors. SDUI Forge resolves this with two-tiered isolation:
* **`WidgetErrorBoundary`:** Wraps each node inside `SduiRenderer`. If a widget encounters a `TypeError` (missing prop) or `SyntaxError` (invalid nested JSON), it renders a localized fallback card with a "Try again" trigger without impacting surrounding cards.
* **`PageErrorBoundary`:** Catches top-level layout collapse and presents an accessible, non-technical banking recovery screen.
* **Enterprise Compliance:** No raw JavaScript stack traces or backend internals are ever displayed to clients. Diagnostic context is routed to centralized APM (`Sentry`, `Datadog`).

### 3. High-Throughput Connection Pool & JVM Tuning

#### HikariCP Tuning for Virtual Threads (`application.yml`)
Because Virtual Threads unmount from platform carrier threads during socket I/O, the connection pool does not need to scale with thread count:
* `maximum-pool-size: 20` (prevents overwhelming the Oracle Server Process limit)
* `connection-timeout: 3000` (fail-fast within 3 seconds)
* `keepalive-time: 60000` (1-minute heartbeat to maintain firewall states)
* `oracle.jdbc.implicitStatementCacheSize: 50` (caches precompiled statement cursors)
* `oracle.net.disableOob: true` (disables out-of-band breaks to prevent socket errors in virtualized k8s networks)

#### Production Docker `JAVA_OPTS` (Java 21 + Generational ZGC)
```bash
JAVA_OPTS="
  -server
  -XX:+UseContainerSupport
  -XX:MaxRAMPercentage=75.0
  -XX:InitialRAMPercentage=50.0
  -XX:MaxMetaspaceSize=256m
  -XX:+UseZGC
  -XX:+ZGenerational
  -Djdk.virtualThreadScheduler.parallelism=4
  -Djdk.virtualThreadScheduler.maxPoolSize=256
  -Djdk.tracePinnedThreads=short
  -XX:+HeapDumpOnOutOfMemoryError
  -XX:HeapDumpPath=/var/log/sdui/oom_dump.hprof
"
```

### 4. JMeter Concurrency & Pinning Strategy
* **Target Load:** 10,000 concurrent virtual users ramped over 10 seconds.
* **Redis Stress:** `GET /sdui-forge/api/v1/pages/1/blueprint` (Target: p99 < 15ms, 0% errors).
* **Kafka Audit Stress:** `GET /sdui-forge/api/v1/menus` (Target: p99 < 40ms, zero HTTP thread blockage).
* **Pinning Diagnostics:** Monitor JVM stdout with `-Djdk.tracePinnedThreads=short` to detect synchronized blocks or native calls pinning carrier threads.

---

## Core Operational Endpoints

| Endpoint | Method | Auth | Description |
|:---|:---:|:---:|:---|
| `/sdui-forge/api/v1/auth/login` | `POST` | Public | Authenticates credentials with BCrypt, records login audit, issues HMAC-SHA256 JWT |
| `/sdui-forge/api/v1/auth/token` | `POST` | Public | Utility endpoint for generating mock test JWTs with custom roles |
| `/sdui-forge/api/v1/menus` | `GET` | Bearer JWT | Retrieves hierarchical navigation menu & dispatches async audit log |
| `/sdui-forge/api/v1/pages/{id}/blueprint` | `GET` | Bearer JWT | Fetches cached JSON page layout, components, and action bindings |
| `/sdui-forge/api/v1/core/accounts/search` | `POST` | Bearer JWT | Core banking account enquiry & live statement generation with Kafka audit |
| `/sdui-forge/api/v1/core/transfers/execute` | `POST` | Bearer JWT | Core banking fund transfer execution with Kafka audit |
| `/sdui-forge/actuator/health` | `GET` | Public | Liveness and readiness probes for Kubernetes |

---

## Architectural Documentation

* [`phase1_deliverables.md`](file:///f:/Research/core-sdui-gateway/phase1_deliverables.md) — Oracle schema design, Spring Data JDBC setup, and JSON blueprint data contracts.
* [`phase2_deliverables.md`](file:///f:/Research/core-sdui-gateway/phase2_deliverables.md) — Next.js 14 dynamic rendering engine, component registry, and skeleton fallbacks.
* [`phase4_deliverables.md`](file:///f:/Research/core-sdui-gateway/phase4_deliverables.md) — Stateless JJWT security, multi-tier Redis caching, and Kafka asynchronous audit trail.
* [`phase5_deliverables.md`](file:///f:/Research/core-sdui-gateway/phase5_deliverables.md) — Testcontainers integration test harness, React error boundaries, HikariCP/ZGC optimization, and JMeter load testing.
