Below is **STEP 2 – GitHub `README.md`**, fully aligned with the Confluence version and written in **clean, professional Markdown**, ready to drop directly into your repository root.

---

```md
# Prompt Craft Studio

Prompt Craft Studio is a web-based prompt engineering and evaluation platform that provides structured scoring and feedback for AI prompts. It uses a Java-based scoring engine exposed securely through a Cloudflare Worker and deployed on Railway. The architecture supports multiple frontend applications using a single backend scoring system.

---

## 🌐 Live Applications

- **Prompt Craft Studio**  
  https://vijayshagunkumar.github.io/Prompt-Craft-Studio/

- **Prompt Craft Pro**  
  https://prompt-crafter-pro.pages.dev/

---

## 🏗️ Architecture Overview

**Frontend (UI)**
- HTML, CSS, JavaScript
- Hosted on GitHub Pages / Cloudflare Pages

**Middleware**
- Cloudflare Worker (`worker.js`)
- Secure gateway and response transformer

**Backend**
- Java Spring Boot Scoring API
- Deployed on Railway

**Flow**
```

Frontend → Cloudflare Worker → Java Scoring API → Transformed Response → UI

```

---

## 📁 Repositories

### Frontend
- Hosted on GitHub
- Deployed via GitHub Pages

### Java Backend (Scoring API)
- Repository:  
  https://github.com/vijayshagunkumar/promptcraft-java-backend

---

## 🧠 Java Backend (Scoring API)

### Local Project Path
```

D:\PrompCraftStudio\promptcraft-java-backend

````

### Technology Stack
- Java 17+
- Spring Boot
- Maven Wrapper

### Development Environment
- IDE: IntelliJ IDEA 2025.3.1.1
- Build Tool: Maven Wrapper (`mvnw.cmd`)

---

## ▶️ Running the Backend Locally

Navigate to the project root:

```powershell
cd D:\PrompCraftStudio\promptcraft-java-backend
````

Run the application:

```powershell
.\mvnw.cmd spring-boot:run
```

### Local Health Check

```
http://localhost:8080/api/v1/health
```

---

## 📦 Building the Application

To build the executable JAR:

```powershell
.\mvnw.cmd clean package
```

Output:

```
target/promptcraft-java-backend-0.0.1-SNAPSHOT.jar
```

### Run JAR Manually

```powershell
java -jar target/promptcraft-java-backend-0.0.1-SNAPSHOT.jar
```

---

## ☁️ Railway Deployment (Java Backend)

### Deployment Model

* GitHub repository connected to Railway
* Automatic CI/CD on each push
* No manual infrastructure setup required

### Railway Build & Run

**Build**

```bash
./mvnw clean package
```

**Run**

```bash
java -jar target/*.jar
```

### Production Health Endpoint

```
https://promptcraft-java-backend-production.up.railway.app/api/v1/health
```

---

## ⚙️ Environment Variables & Profiles

### Spring Profiles

* `default` – Local
* `prod` – Railway

Example:

```bash
--spring.profiles.active=prod
```

### Common Variables

| Variable               | Description | Example  |
| ---------------------- | ----------- | -------- |
| SERVER_PORT            | Server port | 8080     |
| SPRING_PROFILES_ACTIVE | Profile     | prod     |
| JAVA_OPTS              | JVM options | -Xmx512m |

> Railway automatically injects `PORT` at runtime.

---

## 🌍 Cloudflare Worker (Scoring Gateway)

### Purpose

* Acts as a middleware layer
* Calls Java scoring API
* Normalizes scores for frontend (0–50 scale)
* Adds metadata (requestId, timestamp)

### Local Worker Path

```
C:\Users\Vijay Kumar\promptcraft-backend
```

### Deploy Worker

```powershell
wrangler deploy
```

---

## 🔌 Public Scoring API

### Endpoint

```
POST https://promptcraft-api.vijay-shagunkumar.workers.dev/score
```

### Request Body

```json
{
  "prompt": "Create a professional follow-up email for a product demo",
  "tool": "chatgpt"
}
```

### Response

* Final normalized score
* Grade & feedback
* Original Java scoring preserved
* Transformation flag
* Request ID for traceability

---

## 🔄 CI/CD Integration

* GitHub → Railway (Java backend)
* GitHub → Cloudflare Pages (Frontend)
* Shared Cloudflare Worker for all clients
* Zero-downtime deployments

---

## 🧩 Shared Architecture

* One Java scoring engine
* One Cloudflare Worker
* Multiple frontend clients:

  * Prompt Craft Studio
  * Prompt Craft Pro

---

## 🛠️ Troubleshooting

### Maven Wrapper Not Found

```powershell
.\mvnw.cmd spring-boot:run
```

### Port Already in Use

```powershell
set SERVER_PORT=9090
```

### Worker Cannot Reach Backend

* Verify backend `/health` endpoint
* Confirm backend URL in `worker.js`
* Check Railway service status

---

## 🔐 Security Notes

* No user PII stored
* Stateless API design
* Health endpoint is public (read-only)
* Scoring access controlled via Cloudflare Worker
* Architecture supports future auth if required

---

## 📌 Status

* ✅ Production-ready
* ✅ Multi-client architecture
* ✅ Enterprise-grade deployment
* ✅ Extensible design

---

## 📄 License

Private / Internal Project (as applicable)

```

---

## ✅ STEP 2 STATUS
✔ GitHub-ready  
✔ Markdown-compliant  
✔ Matches Confluence content exactly  

---

### 🔜 NEXT
**STEP 3:** Word document format  
**STEP 4:** PNG architecture diagram  

👉 Reply **“Proceed to Word format”** and I’ll continue.
```
