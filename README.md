# PromptCraft Pro — Deployment & Architecture Guide

## Overview

PromptCraft Pro is a production-grade AI prompt engineering platform with a clean, secure, multi-layer architecture.

### Live URLs

- **Frontend (Cloudflare Pages)**  
  https://prompt-crafter-pro.pages.dev/

- **API Proxy (Cloudflare Worker)**  
  https://promptcraft-api.vijay-shagunkumar.workers.dev

- **Java Backend (Railway)**  
  https://promptcraft-java-backend-production.up.railway.app

---

## Architecture (Final)

Browser  
→ Cloudflare Pages (Frontend)  
→ Cloudflare Worker (API Proxy & CORS)  
→ Railway (Spring Boot Java Backend)

---

## Why This Architecture

- Frontend never talks to Java directly (security)
- Worker handles CORS, routing, versioning
- Java backend is isolated and scalable
- Each layer deploys independently

---

## Repository Responsibilities

### 1. Frontend Repository
**Purpose:** UI, UX, prompt generation, scoring UI

**Tech:**
- HTML / CSS / JavaScript
- Hosted on Cloudflare Pages

**Deployment:**
- Triggered automatically on GitHub push to `main`

**No manual deploy commands required**

---

### 2. Cloudflare Worker
**Purpose:** API proxy layer

**Responsibilities:**
- `/health`
- `/score`
- CORS handling
- Secure backend communication

**Deployment Tool:**
- Wrangler CLI

---

### 3. Java Backend (Spring Boot)
**Purpose:** Prompt scoring logic and APIs

**Responsibilities:**
- `/api/v1/health`
- `/api/prompts/score`
- Scoring algorithms

**Deployment Platform:**
- Railway (GitHub auto-deploy)

---

## Deployment Rules (Golden)

- ❌ Browser must never call Java backend directly
- ✅ Browser → Worker → Java only
- ❌ Never deploy Worker from GitHub Web UI
- ✅ Always deploy Worker via `wrangler deploy`
- ✅ Test Java changes locally before pushing
- ⚠️ GitHub Web UI edits allowed only for small frontend changes

---

## Frontend Deployment (Cloudflare Pages)

### Small Changes
1. Edit file in GitHub Web UI
2. Commit to `main`
3. Cloudflare auto-deploys

### Larger Changes (Recommended)
```bash
git clone <frontend-repo>
cd frontend
# make changes
git add .
git commit -m "Update frontend logic"
git push origin main
