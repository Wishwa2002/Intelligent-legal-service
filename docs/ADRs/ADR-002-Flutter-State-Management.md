# ADR 002: Flutter State Management Approach

## Status
Proposed

## Context
The Flutter mobile application needs to manage state across various screens, including:
1. Authentication status and secure JWT token storage.
2. Intake form inputs, validation statuses, and document uploads.
3. Real-time update notifications and case progress tracking.

We need a clean, maintainable, and easily testable state management pattern that is widely adopted and well-documented.

## Options Considered
1. **setState (Epistemic State)**: Good for local widget state, but unusable for sharing state across nested routes (like auth tokens).
2. **BLoC (Business Logic Component)**: Extremely powerful and separation of concerns, but introduces heavy boilerplate and a steep learning curve.
3. **Provider**: The official Google-recommended wrapper around InheritedWidgets. It is simple, testable, and integrates seamlessly with change notification patterns.

## Decision
We will use **Provider** (specifically `ChangeNotifierProvider`) for global and feature-level state management in the Flutter application.

## Justification
- **Low Learning Curve**: Eases development for students learning Flutter in Year 3.
- **Official Recommendation**: Supported directly by the Flutter team.
- **Separation of Concerns**: Business logic is separated from UI rendering by putting logic in `ChangeNotifier` classes.
- **Unit Testing**: Can test model logic without mocking widgets or rendering screens.

## Consequences
- **Positive**: Quick onboarding, clean layout tree, clear separation of UI widgets and state controllers.
- **Negative**: For extremely large applications, state transitions are less structured compared to BLoC. However, it is perfect for the scope of this assignment.
