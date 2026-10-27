# SDUI Forge | Zero-to-Hero Environment Setup Guide

This guide is designed for a **completely brand-new machine** (Windows, macOS, or Linux) with **no development tools or prerequisites installed**. Follow these step-by-step instructions to take a fresh device from zero to a fully operational, production-mirrored **SDUI Forge Core Banking Gateway** environment.

---

## Architecture Stack Overview

When fully configured, your machine will run:
1. **Container Infrastructure (Docker Compose):**
   - **Oracle 23ai Free:** Enterprise SQL engine storing schema, JSON blueprints, and CLOB audit logs (`localhost:1521`, PDB: `FREEPDB1`).
   - **Redis 7 (Alpine):** High-throughput distributed L2 cache (`localhost:6379`).
   - **Apache Kafka 3.7+ (KRaft Mode):** Asynchronous telemetry and audit log streaming without ZooKeeper (`localhost:9092`).
2. **Backend Gateway:**
   - **Java 21 LTS (Project Loom):** Spring Boot 3.4.1 running with Virtual Threads enabled (`localhost:8080/sdui-forge`).
3. **Frontend Dynamic Engine:**
   - **Next.js 14.2.5 (App Router):** React 18, Zustand, Tailwind CSS running in pure JavaScript (`localhost:3000`).

---

## Minimum Hardware Requirements

| Component | Minimum Specification | Recommended Specification |
|:---|:---|:---|
| **CPU** | 4 Cores (x86_64 or Apple Silicon ARM64) | 8 Cores |
| **RAM** | 8 GB RAM | 16 GB+ RAM (Oracle + Kafka + JVM need ~5–6 GB combined) |
| **Storage** | 15 GB Free Disk Space | 30 GB+ Free SSD Storage |
| **OS** | Windows 10/11 (with WSL 2), macOS 12+, or Ubuntu 20.04/22.04/24.04 LTS | Latest LTS release |

---

## Phase 1: Toolchain Installation (From Scratch)

Choose your operating system below and install the required tools.

### Option A: Windows 10 / 11

#### 1. Enable WSL 2 (Windows Subsystem for Linux) & Virtualization
Open **PowerShell as Administrator** and run:
```powershell
wsl --install
```
*Restart your computer if prompted.*

#### 2. Install Package Manager & Tools via WinGet
Open PowerShell (Run as Administrator) and run:
```powershell
# 1. Install Git
winget install --id Git.Git -e --source winget

# 2. Install Java 21 LTS (Eclipse Temurin)
winget install --id EclipseAdoptium.Temurin.21.JDK -e --source winget

# 3. Install Apache Maven 3.9+
winget install --id Apache.Maven -e --source winget

# 4. Install Node.js 20 LTS (includes npm)
winget install --id OpenJS.NodeJS.LTS -e --source winget

# 5. Install Docker Desktop
winget install --id Docker.DockerDesktop -e --source winget
```

#### 3. Configure Windows Environment Variables
Ensure `JAVA_HOME` and `MAVEN_HOME` are set in System Environment Variables:
- **`JAVA_HOME`:** `C:\Program Files\Eclipse Adoptium\jdk-21.0.x-hotspot`
- **`PATH` Additions:**
  - `%JAVA_HOME%\bin`
  - `C:\Program Files\apache-maven-3.9.x\bin` (or path where Maven was installed)

#### 4. Configure PowerShell Execution Policy
Allow executing local scripts by opening PowerShell and running:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

---

### Option B: macOS (Apple Silicon M1/M2/M3 or Intel)

#### 1. Install Homebrew (Mac Package Manager)
Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the terminal instructions to add Homebrew to your `PATH` (e.g. `eval "$(/opt/homebrew/bin/brew shellenv)"`).

#### 2. Install Required Tools via Homebrew
```bash
# 1. Install Git
brew install git

# 2. Install Java 21 LTS (Temurin)
brew install --cask temurin@21

# 3. Install Apache Maven
brew install maven

# 4. Install Node.js 20 LTS
brew install node@20
brew link node@20

# 5. Install Docker Desktop for Mac
brew install --cask docker
```

#### 3. Set `JAVA_HOME` in `~/.zshrc`
Add the following to your `~/.zshrc`:
```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
```

---

### Option C: Linux (Ubuntu 22.04 / 24.04 LTS / Debian)

Open Terminal and execute:
```bash
# 1. Update Package Indices
sudo apt update && sudo apt upgrade -y

# 2. Install Git, Curl, Unzip
sudo apt install -y git curl wget unzip build-essential

# 3. Install OpenJDK 21
sudo apt install -y openjdk-21-jdk

# 4. Install Apache Maven
sudo apt install -y maven

# 5. Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 6. Install Docker Engine & Docker Compose Plugin
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 7. Add current user to Docker group (avoids needing sudo)
sudo usermod -aG docker $USER
newgrp docker
```

---

## Phase 2: Toolchain Verification

Restart your terminal, then verify every tool by checking its version:

```bash
# 1. Verify Git
git --version
# Expected: git version 2.40+ 

# 2. Verify Java 21 LTS
java -version
# Expected: openjdk version "21.0.x" ...

# 3. Verify Maven
mvn -version
# Expected: Apache Maven 3.9.x with Java version 21

# 4. Verify Node.js & npm
node -v
# Expected: v18.x or v20.x
npm -v
# Expected: 9.x or 10.x

# 5. Verify Docker
docker --version
docker compose version
# Expected: Docker version 24+ and Docker Compose v2+
```

> [!IMPORTANT]
> **Docker Desktop Users (Windows / macOS):** Open the Docker Desktop application and wait until the whale icon in the taskbar/menu bar stops animating and shows **"Docker Engine running"**.

---

## Phase 3: Clone Repository

Open your terminal in your desired development workspace folder:

```bash
# Clone the repository
git clone https://github.com/NasorHidar/core-sdui-gateway.git

# Enter the project root directory
cd core-sdui-gateway
```

---

## Phase 4: Launch Infrastructure via Docker Compose

The root directory contains [`docker-compose.yml`](file:///f:/Research/core-sdui-gateway/docker-compose.yml), which defines Oracle 23ai Free, Redis 7, and Apache Kafka KRaft.

### 1. Start the Containers
```bash
docker compose up -d
```

### 2. Verify Container Health
```bash
docker compose ps
```

*Expected Output:*
```
NAME          IMAGE                                                 STATUS
sdui-oracle   container-registry.oracle.com/database/free:latest    running (healthy)
sdui-redis    redis:7-alpine                                        running (healthy)
sdui-kafka    bitnami/kafka:latest                                  running (healthy)
```

> [!NOTE]
> **First-Time Oracle Initialization:** On the very first run, Oracle 23ai creates the Pluggable Database (`FREEPDB1`), creates the `sdui_admin` user, and executes [`01_setup.sql`](file:///f:/Research/core-sdui-gateway/oracle-init/01_setup.sql) and [`02_rich_seed_data.sql`](file:///f:/Research/core-sdui-gateway/oracle-init/02_rich_seed_data.sql). This takes between **60 and 90 seconds**.  
> You can monitor database initialization progress using:
> ```bash
> docker logs -f sdui-oracle
> ```
> Wait until you see: `DATABASE IS READY TO USE!`.

---

## Phase 5: Build and Run Backend Gateway (Spring Boot)

### 1. Test Compilation & Dependencies
From the project root (`core-sdui-gateway`), download all Maven dependencies and compile classes:
```bash
mvn clean test-compile
```

### 2. Run Smoke Integration Tests
Verify that the backend connects cleanly to your running Oracle, Kafka, and Redis instances:
```bash
mvn test -Dtest=LiveSystemSmokeIntegrationTest
```
*Expected: `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS`*

### 3. Start Spring Boot Gateway
Run the backend application:
```bash
mvn spring-boot:run
```

The gateway boots on port **8080** with Project Loom virtual threads enabled.

### 4. Verify Backend Health
Open a browser or secondary terminal and check:
```bash
curl http://localhost:8080/sdui-forge/actuator/health
```
*Expected JSON response:*
```json
{"status":"UP"}
```

---

## Phase 6: Build and Run Frontend (Next.js 14)

Open a **new terminal tab/window** and navigate into the `frontend/` directory:

```bash
cd core-sdui-gateway/frontend
```

### 1. Install Node Dependencies
```bash
npm install
```

### 2. Verify Linting
```bash
npm run lint
```
*Expected: `✔ No ESLint warnings or errors`*

### 3. Start Development Server
```bash
npm run dev
```

*Expected output:*
```
  ▲ Next.js 14.2.5
  - Local:        http://localhost:3000
 ✓ Ready in 1.8s
```

*(Alternatively, to run the optimized production build: `npm run build && npm run start`)*

---

## Phase 7: Access the Application & Test User Personas

Open your browser and navigate to:
**`http://localhost:3000`**

The application automatically redirects you to the secure login screen: **`http://localhost:3000/login`**.

### Default Seed Banking Accounts

The database comes pre-seeded with 4 standard banking personas. The password for all accounts is **`password`**:

| Username | Password | Role Badge | Capabilities / Testing Scope |
|:---|:---|:---|:---|
| **`maker_user`** | `password` | `ROLE_MAKER, ROLE_ADMIN` | **Primary persona:** Account search, fund transfer initiation, dynamic form execution. |
| **`checker_user`** | `password` | `ROLE_CHECKER` | Dual-control authorizations and approvals. |
| **`admin_user`** | `password` | `ROLE_ADMIN` | Full menu and service governance. |
| **`auditor_user`** | `password` | `ROLE_AUDITOR` | Read-only compliance and telemetry inspection. |

---

## Phase 8: Quick Verification Checklist (Testing All Features)

Follow this 2-minute checklist to confirm all 8 core features are working:

1. **Login & RBAC:**
   - Log in with `maker_user` / `password`.
   - Confirm you are redirected to `/dashboard`.
   - In the top header bar, verify your user badge displays `maker_user` and `ROLE_MAKER,ROLE_ADMIN`.
2. **Primary Service Catalog:**
   - Confirm the main dashboard displays cards for:
     - *Retail Core Banking*
     - *Cards & Electronic Payments*
     - *Lending & Credit Facilities*
3. **Hierarchical Navigation (Left Sidebar):**
   - Click on the **Retail Core Banking** card.
   - The left sidebar will expand with nested options (*Customer Dashboard*, *Fund Transfer*, *Transaction History*).
4. **Search Skeleton & Validation:**
   - Click **Customer Dashboard**.
   - A search prompt box appears with an `Account Number` input.
   - Enter `100293847` and click **Search Account**.
5. **Server-Driven UI (SDUI) Form Generation:**
   - The dynamic engine renders the account layout.
   - Notice that account balance and customer details are displayed in **read-only** cards (preventing client-side tampering).
6. **Smart Bypass:**
   - In the sidebar, select a zero-parameter action like **Fallback & Resilience Demo**.
   - The search box is automatically bypassed and loads directly.
7. **Live Audit Trail:**
   - In the top header, click **Live Audit Trail**.
   - A modal opens showing real-time `ACTIVITY_LOG` records streamed from Kafka into Oracle.
8. **Fallback Error Handling:**
   - On the Fallback Demo page, test the error simulation to verify that the UI catches failures gracefully without a white-screen crash.

---

## Phase 9: Troubleshooting & FAQs for New Devices

### Issue 1: `docker compose up` fails with "cannot connect to Docker daemon"
* **Cause:** The Docker daemon is not running yet.
* **Solution:**
  - **Windows / macOS:** Launch the **Docker Desktop** app from your Start Menu / Applications and wait for the status to show "Engine running".
  - **Linux:** Run `sudo systemctl start docker` and ensure your user is in the docker group (`sudo usermod -aG docker $USER`).

### Issue 2: Port Conflict (1521, 6379, 9092, 8080, or 3000 already in use)
* **Cause:** Another local service (e.g. local PostgreSQL, Oracle XE, Redis, or Apache) is using one of the required ports.
* **Diagnosis:**
  - **Windows:** Run `netstat -ano | findstr "8080 3000 1521 6379 9092"`
  - **macOS / Linux:** Run `sudo lsof -i :8080,3000,1521,6379,9092`
* **Solution:** Terminate the competing process using its PID, or reconfigure conflicting software.

### Issue 3: Oracle container exits or crashes on startup
* **Cause:** Insufficient RAM allocated to Docker.
* **Solution:**
  - Open **Docker Desktop Settings** -> **Resources**.
  - Increase allocated Memory to at least **4 GB** (6 GB recommended).
  - Restart Docker Desktop and run `docker compose up -d`.

### Issue 4: `mvn spring-boot:run` fails with `Connection to localhost:1521 refused`
* **Cause:** Spring Boot attempted to connect before the Oracle PDB finished its initial database creation.
* **Solution:**
  - Check Oracle status with `docker compose ps` (look for `(healthy)`).
  - Inspect logs: `docker logs -f sdui-oracle`.
  - Once Oracle prints `DATABASE IS READY TO USE!`, re-run `mvn spring-boot:run`.

### Issue 5: PowerShell script error on Windows (`cannot be loaded because running scripts is disabled`)
* **Cause:** Default Windows PowerShell security policy restricts script execution.
* **Solution:** Open PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
  ```

---

## Phase 10: Graceful Shutdown and Restarting

### To Stop the Application:
1. **Frontend:** Press `Ctrl + C` in the Next.js terminal tab.
2. **Backend:** Press `Ctrl + C` in the Maven Spring Boot terminal tab.
3. **Containers:** Run:
   ```bash
   docker compose down
   ```
   *(This preserves your database records, users, and audit logs in persistent Docker volumes).*

### To Restart the Application on Subsequent Days:
```bash
# 1. Start containers
docker compose up -d

# 2. Start Backend (in Terminal 1)
mvn spring-boot:run

# 3. Start Frontend (in Terminal 2)
cd frontend
npm run dev
```

---

## Need Help?
- Refer to [`README.md`](file:///f:/Research/core-sdui-gateway/README.md) for full architectural specifications, data contracts, and API endpoint details.
- Refer to [`AUDIT_REMEDIATION_REPORT.md`](file:///f:/Research/core-sdui-gateway/AUDIT_REMEDIATION_REPORT.md) for deep technical insights into all security remediations and architectural patterns.
