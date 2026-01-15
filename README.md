Perfect 👍
Below is **ONE SINGLE, CONTINUOUS MARKDOWN BLOCK** — no breaks, no commentary in between — so you can **copy-paste it in one shot** directly into `README.md`.

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

### Java Backend (Scoring API)
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
- IntelliJ IDEA 2025.3.1.1

---

## ▶️ Running the Backend Locally

```powershell
cd D:\PrompCraftStudio\promptcraft-java-backend
.\mvnw.cmd spring-boot:run
````

### Local Health Check

```
http://localhost:8080/api/v1/health
```

---

## 📦 Building the Application

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

* GitHub repository connected to Railway
* Automatic CI/CD on each push

### Build & Run Commands

```bash
./mvnw clean package
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

---

## 🌍 Cloudflare Worker (Scoring Gateway)

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

---

## 🔄 CI/CD Integration

* GitHub → Railway (Java backend)
* GitHub → Cloudflare Pages (Frontend)
* Shared Cloudflare Worker for all clients

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

* Verify backend `/health`
* Check backend URL in `worker.js`

---

## 🔐 Security Notes

* No user PII stored
* Stateless API design
* Health endpoint is public (read-only)
* Scoring access controlled via Cloudflare Worker

---

## 📌 Status

* Production-ready
* Multi-client architecture
* Enterprise-grade deployment
* Extensible design

```

---

✅ **You can now copy everything in one go and paste directly into `README.md`.**

When ready, say **“Proceed to Word format”** and I’ll convert the same content cleanly into a `.docx` structure.
```
