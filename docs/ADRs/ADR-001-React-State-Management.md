# ADR 001: React State Management Approach

## Status
Proposed

## Context
The React web application needs to manage global state such as:
1. User authentication tokens and session details.
2. Filter criteria, search parameters, and pagination state for case dashboards.
3. Live Agent workflow monitoring states and execution logs.
4. Error boundaries and loading flags for API requests.

We require a state management solution that provides high performance, minimal boilerplate, high developer productivity, and full compatibility with React functional components and Hooks.

## Options Considered
1. **React Context API**: Built-in, but causes full-tree re-renders on state updates and can lead to "provider nesting hell."
2. **Redux Toolkit (RTK)**: Industry standard, highly robust, but introduces significant boilerplate for small-to-medium projects.
3. **Zustand**: A lightweight, hooks-based state management library. It uses a simplified pub/sub model without wrapping the app in context providers, avoiding unnecessary re-renders.

## Decision
We will use **Zustand** for global state management in the React web application.

## Justification
- **Zero Boilerplate**: Define a store in a single file with simple setter functions.
- **Selective Re-renders**: Components subscribe to specific slices of state, preventing massive UI redraws.
- **No Provider Wrappers**: Keeps the React component tree clean and readable.
- **Testability**: Zustand stores are pure JavaScript objects/functions and can be tested easily in isolation.

## Consequences
- **Positive**: Rapid feature implementation, clean routing, easy integration with local storage for token persistence.
- **Negative**: Requires team alignment since Zustand lacks the strict, opinionated patterns of Redux.
