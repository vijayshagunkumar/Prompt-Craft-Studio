Prompt Craft Studio – Technical Architecture & Deployment Documentation



By Vijay Kumar

2 min

Add a reaction
Prompt Craft Studio – Technical Architecture & Deployment Documentation
1. Overview
Application Name: Prompt Craft Studio
Live Application URL:
PromptCraft STUDIO | Enterprise AI Prompt Assistant 

Product Summary – Prompt Craft
Prompt Craft is a prompt-generation and AI guidance platform designed to help users convert their ideas into clear, structured, and high-quality AI prompts. It enables users to describe their requirements using text or voice and automatically transforms those inputs into optimized prompts that deliver better results from AI systems.

In addition to generating prompts, Prompt Craft intelligently recommends the most suitable AI tool for each use case, guiding users toward platforms such as ChatGPT or Gemini based on the nature of the task. From within the application, users can open the recommended AI tool, copy the generated prompt, and immediately use it to obtain accurate and relevant responses.

The platform incorporates a backend evaluation mechanism that assesses prompt quality and structure to continuously improve prompt effectiveness. This evaluation supports prompt refinement but remains transparent to the user, ensuring a simple and intuitive experience.

Prompt Craft is built with a scalable, cloud-based architecture and follows a stateless design, with no user data stored. The same backend services support multiple frontend applications, ensuring consistency, maintainability, and extensibility.

Overall, Prompt Craft simplifies the interaction between users and AI tools by bridging the gap between human intent and effective AI communication.

It uses a shared Java-based backend, securely accessed through Cloudflare Workers and deployed on Railway, to support multiple frontend applications with a scalable and maintainable architecture.

 

2. High-Level Architecture
Frontend (Web UI)

Hosted on GitHub Pages / Cloudflare Pages

Built using HTML, CSS, and JavaScript

Middleware Layer

Cloudflare Worker (worker.js)

Acts as a secure gateway and response transformer

Backend (Scoring Engine)

Java Spring Boot application

Deployed on Railway

Public health endpoint, controlled scoring access

3. Frontend (UI Layer)
Technology Stack

HTML

CSS

JavaScript

Source Control

Hosted on GitHub

Deployed using GitHub Pages

Live URL

PromptCraft STUDIO | Enterprise AI Prompt Assistant 

4. Java Backend (Scoring API)
4.1 Source Repository
GitHub - vijayshagunkumar/promptcraft-java-backend: promptcraft-java-backend 

4.2 Local Project Location


D:\PrompCraftStudio\promptcraft-java-backend
This directory contains the complete Spring Boot–based scoring application.

4.3 Development Environment
IDE: IntelliJ IDEA 2025.3.1.1

Java Version: JDK 17+

Build Tool: Maven Wrapper

5. Java Deployment & Execution
5.1 Prerequisites
Java JDK 17 or later

Git

Internet connectivity for Maven dependencies

5.2 Running Locally


cd D:\PrompCraftStudio\promptcraft-java-backend
.\mvnw.cmd spring-boot:run
Local Health Check



http://localhost:8080/api/v1/health
5.3 Building the Application


.\mvnw.cmd clean package
Generated artifact:



target/promptcraft-java-backend-0.0.1-SNAPSHOT.jar
5.4 Running the JAR Manually


java -jar target/promptcraft-java-backend-0.0.1-SNAPSHOT.jar
6. Environment Variables & Profiles
6.1 Spring Profiles
default – Local development

prod – Railway deployment

Example:



--spring.profiles.active=prod
6.2 Common Environment Variables
Variable

Description

Example

SERVER_PORT

Application port

8080

SPRING_PROFILES_ACTIVE

Active profile

prod

JAVA_OPTS

JVM tuning

-Xmx512m

Railway automatically injects the PORT variable during runtime.

7. Railway Deployment (Java Backend)
7.1 Deployment Model
GitHub repository connected directly to Railway

Automatic CI/CD on every push

No manual infrastructure management

7.2 Build & Run Commands (Railway)
Build Phase



./mvnw clean package
Run Phase



java -jar target/*.jar
7.3 Production Health Check


https://promptcraft-java-backend-production.up.railway.app/api/v1/health
8. Cloudflare Worker (Scoring Gateway)
8.1 Purpose
Acts as a secure middleware layer

Calls Java backend scoring API

Normalizes score to frontend scale

Adds metadata (requestId, timestamp, transformation flag)

8.2 Local Worker Source


C:\Users\Vijay Kumar\promptcraft-backend
8.3 Deployment


wrangler deploy
9. Public Scoring API
9.1 Endpoint


POST https://promptcraft-api.vijay-shagunkumar.workers.dev/score
9.2 Request Payload


{
  "prompt": "Create a professional follow-up email for a product demo",
  "tool": "chatgpt"
}
10. CI/CD & Repository Integration
GitHub → Railway (Java backend)

GitHub → Cloudflare Pages (UI apps)

Cloudflare Worker shared across applications

Zero-downtime deployments

11. Shared Architecture
One Java Scoring Engine

One Cloudflare Worker

Multiple frontends:

Prompt Craft Studio

Prompt Craft Pro

12. Troubleshooting
Maven Wrapper Issue



.\mvnw.cmd spring-boot:run
Port Conflict



set SERVER_PORT=9090
Worker Connectivity Issue

Validate backend /health

Verify backend URL in worker.js

13. Security Notes
No user PII stored

Stateless API processing

No authentication (intentional design)

Architecture supports future token-based security

14. End-to-End Flow
Frontend
→ Cloudflare Worker
→ Java Scoring API (Railway)
→ Response Transformation
→ UI Display

