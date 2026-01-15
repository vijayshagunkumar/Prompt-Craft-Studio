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
