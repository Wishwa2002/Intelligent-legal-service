# ADR 005: Cloud Deployment Platform Selection

## Status
Proposed

## Context
The university assignment requires all components of the system to be deployed and accessible online:
1. The ASP.NET Core API must provide public Health and Swagger URLs.
2. The PostgreSQL database must be deployed securely with migrations applied.
3. The React web application must be hosted on a live public URL.
4. The Python Agentic AI service must run in a location where the C# API can securely call it.

All hosting must be done using free-tier / no-cost cloud service plans.

## Options Considered
1. **Microsoft Azure / AWS**: Highly professional but requires credit cards, and free credits expire quickly.
2. **Localhost Only with Tunneling (Ngrok)**: Violates the deployment requirement (evaluators must access it independently at any time).
3. **Render, Neon DB, and Vercel**:
   - **Neon DB**: Free-tier cloud PostgreSQL with autoscaling.
   - **Render**: Free-tier hosting for web apps (supports C# and Python runtimes).
   - **Vercel**: Free-tier hosting for React/static websites.

## Decision
We will deploy the application components using the following stack:
- **Database**: Hosted on **Neon DB**.
- **C# Backend & Python AI Backend**: Hosted on **Render** (via Dockerfiles).
- **React Frontend**: Hosted on **Vercel**.
- **Flutter Mobile**: Distributed as a runnable Android APK.

## Justification
- **100% Free**: No financial cost to the students.
- **EF Core Migrations**: Neon DB supports remote SSL connections, allowing EF Core CLI to apply migrations from GitHub Actions or local machines.
- **CI/CD Integration**: Vercel and Render connect directly to GitHub, enabling auto-deploy on main branch pushes.

## Consequences
- **Positive**: Production-grade environments, fully automated deployments, zero-cost.
- **Negative**: Render's free tier spins down containers after 15 minutes of inactivity. Initial request cold starts may take 30-50 seconds (this behavior will be clearly documented for the course evaluators).
