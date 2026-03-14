# PromptCraft Studio

### Technical Architecture & Deployment Documentation

**Author:** Vijay Kumar

---

# 1. Overview

**Application Name:** PromptCraft Studio

**Live Application:**
🔗 PromptCraft STUDIO – Enterprise AI Prompt Assistant

---

## Product Summary

PromptCraft Studio is a **prompt-generation and AI guidance platform** designed to help users convert their ideas into **clear, structured, and high-quality AI prompts**.

Users describe their requirements using **text or voice**, and the system automatically transforms those inputs into optimized prompts that deliver better results from AI systems.

In addition to prompt generation, PromptCraft **intelligently recommends the most suitable AI tool** for each use case. Based on the nature of the task, users are guided toward platforms such as **ChatGPT or Gemini**.

From within the application, users can:

* Generate structured prompts
* Copy prompts directly
* Open recommended AI tools
* Execute prompts immediately

The platform also includes a **backend prompt evaluation engine** that analyzes prompt quality and structure to continuously improve effectiveness.

Key characteristics of the platform:

* Stateless architecture
* No user data stored
* Cloud-native deployment
* Shared backend services supporting multiple frontend applications

PromptCraft bridges the gap between **human intent and effective AI communication**.

---

# 2. High-Level Architecture

```
Frontend (Web UI)
        │
        ▼
Cloudflare Worker (Middleware / API Gateway)
        │
        ▼
Java Spring Boot Scoring Engine
        │
        ▼
Railway Cloud Deployment
```

---

# 3. Frontend (UI Layer)

## Technology Stack

* HTML
* CSS
* JavaScript

## Source Control

Hosted on **GitHub**

## Deployment

Deployed using:

* GitHub Pages
* Cloudflare Pages

## Live Application

🔗 PromptCraft STUDIO – Enterprise AI Prompt Assistant

---

# 4. Java Backend (Scoring API)

## 4.1 Source Repository

GitHub Repository

```
https://github.com/vijayshagunkumar/promptcraft-java-backend
```

---

## 4.2 Local Project Location

```
D:\PrompCraftStudio\promptcraft-java-backend
```

This directory contains the **complete Spring Boot–based scoring application**.

---

## 4.3 Development Environment

| Component    | Tool                     |
| ------------ | ------------------------ |
| IDE          | IntelliJ IDEA 2025.3.1.1 |
| Java Version | JDK 17+                  |
| Build Tool   | Maven Wrapper            |

---

# 5. Java Deployment & Execution

## 5.1 Prerequisites

* Java JDK 17+
* Git
* Internet connectivity for Maven dependencies

---

## 5.2 Running Locally

```bash
cd D:\PrompCraftStudio\promptcraft-java-backend
.\mvnw.cmd spring-boot:run
```

### Local Health Check

```
http://localhost:8080/api/v1/health
```

---

## 5.3 Building the Application

```bash
.\mvnw.cmd clean package
```

Generated artifact:

```
target/promptcraft-java-backend-0.0.1-SNAPSHOT.jar
```

---

## 5.4 Running the JAR

```bash
java -jar target/promptcraft-java-backend-0.0.1-SNAPSHOT.jar
```

---

# 6. Environment Variables & Profiles

## 6.1 Spring Profiles

| Profile | Description        |
| ------- | ------------------ |
| default | Local development  |
| prod    | Railway deployment |

Example:

```bash
--spring.profiles.active=prod
```

---

## 6.2 Environment Variables

| Variable               | Description      | Example  |
| ---------------------- | ---------------- | -------- |
| SERVER_PORT            | Application port | 8080     |
| SPRING_PROFILES_ACTIVE | Active profile   | prod     |
| JAVA_OPTS              | JVM tuning       | -Xmx512m |

Railway automatically injects the **PORT** variable during runtime.

---

# 7. Railway Deployment (Java Backend)

## 7.1 Deployment Model

* GitHub repository connected directly to Railway
* Automatic CI/CD on every push
* No manual infrastructure management

---

## 7.2 Build & Run Commands

### Build Phase

```bash
./mvnw clean package
```

### Run Phase

```bash
java -jar target/*.jar
```

---

## 7.3 Production Health Check

```
https://promptcraft-java-backend-production.up.railway.app/api/v1/health
```

---

# 8. Cloudflare Worker (Scoring Gateway)

## 8.1 Purpose

The Cloudflare Worker acts as a **secure middleware layer**.

Responsibilities:

* Calls Java backend scoring API
* Normalizes scores for frontend display
* Adds metadata

  * requestId
  * timestamp
  * transformation flags

---

## 8.2 Local Worker Source

```
C:\Users\Vijay Kumar\promptcraft-backend
```

---

## 8.3 Deployment

```bash
wrangler deploy
```

---

# 9. Public Scoring API

## Endpoint

```
POST https://promptcraft-api.vijay-shagunkumar.workers.dev/score
```

---

## Request Payload

```json
{
  "prompt": "Create a professional follow-up email for a product demo",
  "tool": "chatgpt"
}
```

---

# 10. CI/CD & Repository Integration

Deployment flow:

```
GitHub → Railway (Java Backend)
GitHub → Cloudflare Pages (Frontend)
Cloudflare Worker → Shared Middleware Layer
```

Key capabilities:

* Automated deployments
* Zero-downtime updates
* Shared infrastructure across multiple applications

---

# 11. Shared Architecture

The backend infrastructure is designed to support **multiple frontend products**.

Shared components:

* One Java Scoring Engine
* One Cloudflare Worker
* Multiple UI applications

Supported frontend applications:

* PromptCraft Studio
* PromptCraft Pro

---

# 12. Troubleshooting

## Maven Wrapper Issue

```bash
.\mvnw.cmd spring-boot:run
```

---

## Port Conflict

```bash
set SERVER_PORT=9090
```

---

## Worker Connectivity Issue

Steps to verify:

1. Validate backend `/health` endpoint
2. Verify backend URL configured in `worker.js`
3. Confirm worker deployment

---

# 13. Security Notes

Security design principles:

* No user PII stored
* Stateless API processing
* No authentication (intentional design for MVP)
* Architecture supports future token-based authentication

---

# 14. End-to-End Flow

```
User Input (Frontend UI)
        │
        ▼
Cloudflare Worker
        │
        ▼
Java Scoring API (Railway)
        │
        ▼
Response Transformation
        │
        ▼
Prompt Score Display in UI
```

---

# Author

**Vijay Kumar**
Product Leader – AI Platforms, Enterprise Systems & Digital Transformation

---

