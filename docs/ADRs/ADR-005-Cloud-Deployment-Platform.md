# ADR 005: Cloud Deployment Platform Selection

## Status
Proposed

## Context
The university assignment requires all components of the system to be deployed and accessible online:
1. The ASP.NET Core API must provide public Health and Swagger URLs.
2. The PostgreSQL database must be deployed securely with migrations applied.
3. The React web application must be hosted on a live public URL.
4. The two Python FastAPI services must run where only the C# API calls their protected endpoints.

Hosting costs must be checked against the selected student accounts before deployment.

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
- **C# Backend & two Python AI services**: Planned for **Render** using the three repository Dockerfiles.
- **React Frontend**: Hosted on **Vercel**.
- **Flutter Mobile**: Distributed as a runnable Android APK.

## Justification
- **Cost goal**: Select available student or free plans after checking current provider limits.
- **EF Core Migrations**: Neon DB supports remote SSL connections, allowing EF Core CLI to apply migrations from GitHub Actions or local machines.
- **Deployment configuration**: The three Dockerfiles and Vercel rewrite are prepared on the deployment-readiness branch. Hosting and live URLs are still to be verified.

## Consequences
- **Positive**: Production-grade environments, fully automated deployments, zero-cost.
- **Operational work**: Apply migrations to the hosted PostgreSQL database, configure each service's environment variables, and record live health, Swagger, and end-to-end evidence before submission.
