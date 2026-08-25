# ADR 003: Agentic AI Framework and Orchestration Method

## Status
Proposed

## Context
The system must support a complex, multi-step Agentic AI workflow:
1. Parse client goals and create a plan.
2. Verify conflicts and look up precedents.
3. Draft a legal document or brief.
4. Deterministically validate outputs.
5. Handle human-in-the-loop approvals.

The workflow must have state persistence, error boundaries, allow-listed tools, and be isolated from the client apps behind the C# ASP.NET Core gateway.

## Options Considered
1. **Semantic Kernel (C#)**: Integrates directly inside the C# Web API. However, it has a steep learning curve and weaker support for Python-native agent orchestrators like LangGraph, which are standard in AI research labs.
2. **Custom C# State Machine**: Build orchestration using native C# classes. Lightweight but lacks built-in agent features, memory management, and prompt engineering utilities.
3. **LangGraph (Python)**: A framework for building stateful, multi-actor applications with LLMs. Built on top of LangChain, it compiles graphs with cycles, agent states, and human-in-the-loop interruptions natively.

## Decision
We will use **LangGraph (Python)** running as an internal service behind a **FastAPI** web framework. The C# Web API will communicate with this service via HTTP.

## Justification
- **Alignment with Labs**: LangGraph is the exact framework utilized in the university coursework labs.
- **Stateful Cycles**: Naturally supports cyclical workflows (e.g., *Draft* $\rightarrow$ *Validate* $\rightarrow$ *Failed* $\rightarrow$ *Redraft*).
- **Human-in-the-Loop Interruptions**: LangGraph has built-in thread persistence and memory savers to pause graph execution until user approval is received.
- **Security**: Operating as a private internal service prevents direct client calls, securing LLM API keys and backend databases.

## Consequences
- **Positive**: Access to rich Python AI ecosystems, natural support for multi-agent delegation, and clean execution logs.
- **Negative**: Requires maintaining two separate backend runtimes (.NET 8 and Python 3.10+).
