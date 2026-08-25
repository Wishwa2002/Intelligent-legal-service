# ADR 004: Database Schema Strategy for Agent Workflow State

## Status
Proposed

## Context
To meet the "Shared State" and "Observability" guidelines in the specification, the database must persist the state of the Agentic AI workflow. This includes:
1. The unique workflow ID.
2. The overall domain objective.
3. The planned list of tasks.
4. The status of completed steps.
5. Validation failures, warnings, errors, and approvals.

We need a design that allows the AI system to resume after a pause (like waiting for manager approval) while providing full history logs to the React and Flutter clients.

## Options Considered
1. **Fully Relational Columns**: Create separate tables and columns for every step's intermediate outputs. This is brittle, as agent structures change often.
2. **Raw JSON Blob Only**: Store all state in a single text/json field in the case request table. Simple, but makes querying individual step histories or generating audit logs difficult.
3. **Single-Table State Log with Separate Audit Trail**:
   - `AgentWorkflowStates`: Stores the current step, the shared state variables (as JSONB), and target deadlines.
   - `AgentAuditLogs`: A log-style table that records every single step action, tool call, input/output parameters, and timestamp.

## Decision
We will adopt Option 3: **A Single-Table State Log (`AgentWorkflowStates`) combined with a detailed history audit table (`AgentAuditLogs`)** in PostgreSQL.

## Justification
- **Flexibility**: Storing the shared state variables as JSONB allows the Python LangGraph state schema to change without requiring database migrations in EF Core.
- **Auditable Records**: The `AgentAuditLogs` table provides a robust database record of every individual LLM prompt and tool invocation, directly matching the "Observability" rubric criterion.
- **Transactional Consistency**: Easy to query and update inside Entity Framework transactions.

## Consequences
- **Positive**: Full traceability, easy resume capability, and standard Postgres JSONB indexing.
- **Negative**: Requires serialization and deserialization of JSON payloads between .NET C# and Python.
