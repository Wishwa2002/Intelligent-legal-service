# Intelligent Legal Service & Case Management System

## Avvo-Inspired Legal Firm Platform

A modern, cross-platform legal firm website inspired by lawyer-discovery platforms such as Avvo. The system allows customers to discover lawyers, request appointments, use documentation services through clerks, read verified legal updates, and explore career opportunities.

The platform includes:

- Lawyer discovery and profiles
- Legal service and specialization browsing
- Appointment booking and scheduling
- Clerk-based documentation services
- Secure document upload and tracking
- Latest laws and legal updates
- Careers and job applications
- Customer service requests
- Agentic AI recommendations and workflow automation
- React web dashboard
- Flutter mobile application
- Role-based authentication and authorization
- Auditable approval-based AI workflows

> **Design direction:** Avvo-inspired lawyer discovery with an original legal-firm brand, layout, colors, content, and user experience. Do not copy Avvo's branding, proprietary content, or exact design.

---

# 1. Project Objectives

The main objective is to build a legal firm platform that connects customers with the firm's lawyers and clerks while providing useful legal information and internal administrative tools.

## Customer Objectives

Customers should be able to:

1. Register and log in securely.
2. Browse lawyers and legal services.
3. Search lawyers by specialization and other filters.
4. View lawyer profiles and availability.
5. Book, cancel, or request rescheduling of appointments.
6. Submit documentation requests.
7. Upload documents securely.
8. Track documentation request progress.
9. Read verified legal updates and latest laws.
10. Browse career opportunities.
11. Submit job applications.
12. Submit legal service requests supported by Agentic AI.
13. View request status and workflow progress through Flutter.

## Staff and Admin Objectives

Authorized staff members should be able to:

- Manage lawyers and legal services.
- Manage specializations and lawyer availability.
- Manage appointments.
- Manage clerks and documentation requests.
- Review uploaded document metadata and request status.
- Publish and manage legal updates.
- Manage career vacancies and applications.
- Monitor AI workflows.
- Approve, reject, or request revisions to AI proposals.
- View audit logs, validation results, and execution summaries.
- Access reports and analytics.

---

# 2. Technology Stack

## Backend

- ASP.NET Core Web API
- C#
- Entity Framework Core
- PostgreSQL
- JWT Authentication
- Role-Based Authorization
- REST API
- Dependency Injection
- DTOs and service/application layer
- Swagger / OpenAPI
- Global exception handling
- Structured logging

## Web Application

- React
- React Router
- Responsive design
- Protected routes
- Form validation
- API integration
- Search, filtering, sorting, and pagination
- Dashboard and reporting components

## Mobile Application

- Flutter
- Dart
- Secure token storage
- API integration
- Protected screens
- Form validation
- File picker, camera, image picker, or another meaningful device feature

## Agentic AI

- Planning / Coordinator Agent
- Lawyer Recommendation Agent
- Scheduling Agent
- Documentation Agent
- Allow-listed tools
- Structured input and output schemas
- Deterministic business-rule validation
- Approval workflow
- Audit logging
- Retry limits and timeouts
- Safe failure handling
- Prompt injection resistance

## Development

- Git and GitHub
- Feature branches
- Pull requests and code reviews
- GitHub Actions
- Docker where appropriate
- Cloud deployment
- Environment variables and secret management

---

# 3. Main User Roles

The system should support at least the following roles:

## Customer

- Browse lawyers and services
- Book appointments
- Submit documentation requests
- Upload files
- Read legal updates
- Apply for careers
- Track requests and appointments

## Lawyer

- Manage professional profile
- Manage availability
- View assigned appointments
- Update appointment status
- View permitted customer/request information

## Clerk

- Manage assigned documentation requests
- Review permitted file metadata
- Update documentation progress
- Communicate request status through the platform

## Admin / Service Manager

- Manage users, lawyers, clerks, services, and content
- Manage legal updates and careers
- Monitor reports
- Review and approve AI-generated proposals
- Access audit logs and workflow summaries

---

# 4. System Architecture

```text
                 Flutter Mobile App
                         |
                         |
                  React Web App
                         |
                         |
                 ASP.NET Core API
                         |
       +-----------------+------------------+
       |                 |                  |
 Authentication    Domain Services    AI Workflow Platform
 Authorization          |                  |
       |         +------+------+           |
       |         |      |      |           |
       |      Lawyers  Booking Documentation
       |         |      |      |           |
       +---------+------+------+-----------+
                         |
                 Entity Framework Core
                         |
                    PostgreSQL
                         |
                 Audit and Reporting
```

## Architecture Rules

1. React and Flutter must use the same ASP.NET Core API.
2. Both clients must use the same authentication, permissions, business rules, and database.
3. Clients must not directly call a Python AI service.
4. If Python is used, it must be called internally through the backend.
5. AI output must not directly update important business records.
6. Backend validation must be performed before any database-changing action.
7. High-impact actions must require approval from an authorized staff member.
8. Store workflow state, validation results, execution summaries, approval decisions, and audit information.
9. Do not store hidden model reasoning, passwords, tokens, or unnecessary sensitive information.

---

# 5. Four-Member Responsibility Allocation

Each member owns one primary business component. Every member must contribute to backend development, database design, React, Flutter, Agentic AI, testing, Git/GitHub, and documentation.

No member should be assigned only project management, testing, or documentation.

---

# Member 1 — Lawyer & Legal Service Management

## Primary Responsibility

Manage lawyers, legal services, specializations, lawyer profiles, lawyer discovery, and lawyer availability.

This member owns the complete lawyer discovery experience inspired by platforms such as Avvo.

## Main Entities

- Lawyer
- LegalService
- Specialization
- LawyerSpecialization
- LawyerAvailability

## Backend Responsibilities

### Lawyer APIs

```http
POST   /api/lawyers
GET    /api/lawyers
GET    /api/lawyers/{id}
PUT    /api/lawyers/{id}
DELETE /api/lawyers/{id}
```

### Legal Service APIs

```http
POST   /api/legal-services
GET    /api/legal-services
GET    /api/legal-services/{id}
PUT    /api/legal-services/{id}
DELETE /api/legal-services/{id}
```

### Specialization APIs

```http
POST   /api/specializations
GET    /api/specializations
PUT    /api/specializations/{id}
DELETE /api/specializations/{id}
```

### Discovery and Availability APIs

```http
GET    /api/lawyers/search
GET    /api/lawyers/{id}/specializations
GET    /api/lawyers/{id}/availability
POST   /api/lawyers/{id}/availability
PUT    /api/lawyers/{id}/availability/{availabilityId}
DELETE /api/lawyers/{id}/availability/{availabilityId}
```

## Business Rules

- Lawyer profiles must contain valid information.
- Only authorized users can create or update lawyer records.
- Customers can view public lawyer information only.
- Duplicate specialization assignments must be prevented.
- Availability start and end times must be valid.
- Inactive lawyers must not be presented as available for new bookings.
- Search must support specialization, legal service, experience, location, and availability where applicable.
- Implement filtering, sorting, and pagination.
- Lawyer IDs and service IDs must be validated before use.

## React Responsibilities

- Lawyer listing page
- Lawyer profile page
- Search and filter interface
- Specialization filters
- Legal service browsing
- Availability management
- Admin lawyer CRUD
- Responsive lawyer cards
- Loading, empty, success, and error states
- Protected staff/admin routes

## Flutter Responsibilities

- Browse lawyers
- Search lawyers
- Filter by specialization or service
- View lawyer profile
- View lawyer availability
- Select a lawyer before booking
- Display inactive or unavailable lawyers correctly

## Assigned Agent: Lawyer Recommendation Agent

### Purpose

Recommend suitable lawyers based on customer requirements and available backend data.

### Tools

- `searchLawyers`
- `getLegalServiceDetails`
- `getLawyerSpecializations`
- `getLawyerAvailability`

### Example Input

```json
{
  "customerRequest": "Need assistance with a property dispute",
  "legalServiceId": "uuid",
  "preferredLocation": "Colombo",
  "preferredDate": "2026-10-10"
}
```

### Example Output

```json
{
  "recommendations": [
    {
      "lawyerId": "uuid",
      "reasonCodes": [
        "SPECIALIZATION_MATCH",
        "AVAILABILITY_MATCH"
      ],
      "matchSummary": "Matches the selected legal service and availability."
    }
  ],
  "validationStatus": "VALIDATED"
}
```

### Agent Rules

- Recommend only lawyers returned by authorized backend tools.
- Never invent lawyer names, IDs, qualifications, or availability.
- Return structured output.
- Use deterministic validation.
- Fail safely when no suitable lawyer is found.
- Do not provide unsupported legal judgments.

## Testing Responsibilities

- Lawyer CRUD tests
- Legal service CRUD tests
- Specialization relationship tests
- Availability validation tests
- Search, filtering, sorting, and pagination tests
- Authorization tests
- React lawyer search and profile tests
- Flutter lawyer browsing tests
- Recommendation Agent golden test cases
- Invalid input and no-result tests

---

# Member 2 — Booking & Appointment Management

## Primary Responsibility

Manage appointments, lawyer availability usage, booking, confirmation, cancellation, rescheduling, completion, and appointment history.

## Main Entities

- Appointment
- AppointmentStatusHistory
- AvailabilitySlot

Member 2 may reuse lawyer availability provided by Member 1, but Member 2 owns appointment business rules.

## Backend Responsibilities

### Appointment APIs

```http
POST   /api/appointments
GET    /api/appointments
GET    /api/appointments/{id}
PUT    /api/appointments/{id}
DELETE /api/appointments/{id}
```

### Appointment Action APIs

```http
POST /api/appointments/{id}/confirm
POST /api/appointments/{id}/cancel
POST /api/appointments/{id}/reschedule
POST /api/appointments/{id}/complete
GET  /api/appointments/{id}/history
```

### Availability APIs

```http
GET /api/appointments/available-slots
GET /api/lawyers/{lawyerId}/schedule
GET /api/appointments/check-conflict
```

## Appointment Statuses

```text
Requested
Confirmed
Rejected
Rescheduled
Cancelled
Completed
```

Implement and validate allowed status transitions in the backend.

## Business Rules

- Customers cannot book unavailable slots.
- Double booking must be prevented.
- Lawyers cannot have overlapping appointments.
- Appointment creation must validate customer, lawyer, service, date, and time.
- Only authorized staff or lawyers can confirm or reject appointments.
- Customers can cancel or request rescheduling according to business rules.
- Completed appointments cannot be edited as active appointments.
- Every status change must be stored in appointment history.
- Use transactions or suitable concurrency controls for booking.
- AI can suggest a time but cannot directly confirm the final booking.

## React Responsibilities

- Appointment dashboard
- Calendar or appointment list
- Appointment details
- Confirm and reject actions
- Reschedule workflow
- Cancellation workflow
- Appointment history
- Filters by customer, lawyer, date, and status
- Protected staff and lawyer routes
- Conflict and invalid-transition error handling

## Flutter Responsibilities

- View available slots
- Book an appointment
- View upcoming appointments
- View appointment history
- Cancel an appointment
- Request rescheduling
- View appointment status
- Display conflict and validation messages

## Assigned Agent: Scheduling Agent

### Purpose

Suggest valid appointment slots using verified lawyer availability and conflict data.

### Tools

- `getAvailableSlots`
- `checkAppointmentConflict`
- `getLawyerSchedule`

### Example Input

```json
{
  "lawyerId": "uuid",
  "preferredDate": "2026-10-10",
  "preferredTimeRange": {
    "start": "09:00",
    "end": "16:00"
  },
  "durationMinutes": 30
}
```

### Example Output

```json
{
  "suggestedSlots": [
    {
      "start": "2026-10-10T10:00:00",
      "end": "2026-10-10T10:30:00",
      "reasonCode": "AVAILABLE_AND_NO_CONFLICT"
    }
  ],
  "validationStatus": "VALIDATED"
}
```

### Agent Rules

- Use backend availability data only.
- Never claim a slot is available without verification.
- Do not create or confirm appointments directly.
- Recheck availability before final booking.
- Handle conflicts, timeouts, and unavailable data safely.
- Return an empty list when no valid slot exists.

## Testing Responsibilities

- Appointment CRUD tests
- Status transition tests
- Double-booking and concurrency tests
- Rescheduling and cancellation tests
- Appointment history tests
- Authorization tests
- React appointment dashboard tests
- Flutter booking and status tests
- Scheduling Agent tests
- AI suggestion versus backend validation tests

---

# Member 3 — Clerk & Documentation Management

## Primary Responsibility

Manage clerks, documentation services, documentation requests, file metadata, secure uploads, and documentation progress tracking.

Career features may be included as a secondary feature only after the core documentation functionality is completed.

## Main Entities

- Clerk
- DocumentationRequest
- DocumentFile
- DocumentationService
- Career
- JobApplication

## Backend Responsibilities

### Documentation Service APIs

```http
POST   /api/documentation-services
GET    /api/documentation-services
GET    /api/documentation-services/{id}
PUT    /api/documentation-services/{id}
DELETE /api/documentation-services/{id}
```

### Documentation Request APIs

```http
POST /api/documentation-requests
GET  /api/documentation-requests
GET  /api/documentation-requests/{id}
PUT  /api/documentation-requests/{id}
POST /api/documentation-requests/{id}/assign-clerk
POST /api/documentation-requests/{id}/update-status
GET  /api/documentation-requests/{id}/history
```

### Clerk APIs

```http
POST /api/clerks
GET  /api/clerks
GET  /api/clerks/{id}
PUT  /api/clerks/{id}
DELETE /api/clerks/{id}
GET  /api/clerks/workload
```

### File APIs

```http
POST   /api/documentation-requests/{id}/files
GET    /api/documentation-requests/{id}/files
DELETE /api/documentation-files/{id}
```

### Optional Career APIs

```http
GET  /api/careers
GET  /api/careers/{id}
POST /api/careers/{id}/applications
GET  /api/job-applications
GET  /api/job-applications/{id}
POST /api/job-applications/{id}/update-status
```

## Business Rules

- Private documents must be accessible only to authorized users.
- File type and file size must be validated.
- Sensitive files must not be publicly exposed.
- Documentation requests must follow valid status transitions.
- Clerks must be active and eligible before assignment.
- Clerk workload should be considered before assignment.
- File access must be checked using ownership or staff permissions.
- Documentation history must be auditable.
- Avoid storing unnecessary sensitive information.
- Handle upload, storage, timeout, and third-party failures safely.

## React Responsibilities

- Documentation request dashboard
- Documentation service management
- Clerk management
- Clerk workload view
- Assign clerk workflow
- Documentation status updates
- Secure file metadata view
- Career vacancy management
- Job application management
- Protected staff/admin routes
- Upload progress and error states

## Flutter Responsibilities

- Submit documentation request
- Select documentation service
- Upload required files
- View documentation status
- View request history
- View assigned clerk information where permitted
- Use a meaningful device feature such as camera, image picker, or file picker
- Display missing-document messages

## Assigned Agent: Documentation Agent

### Purpose

Analyze documentation requests and recommend required documents, documentation services, or suitable clerks using configured business rules and backend data.

### Tools

- `getDocumentationService`
- `getRequiredDocumentRules`
- `getAvailableClerks`
- `getClerkWorkload`

### Example Output

```json
{
  "requiredDocuments": [
    {
      "documentType": "Identity Document",
      "required": true,
      "reasonCode": "SERVICE_RULE_MATCH"
    }
  ],
  "clerkSuggestions": [
    {
      "clerkId": "uuid",
      "reasonCode": "AVAILABLE_AND_ELIGIBLE"
    }
  ],
  "validationStatus": "VALIDATED"
}
```

### Agent Rules

- Required documents must come from configured business rules.
- Never invent legal requirements.
- Clerk suggestions must use verified backend data.
- Do not make unsupported legal decisions.
- Avoid sending private document contents to the AI unnecessarily.
- Final clerk assignment and status updates must be validated by the backend.
- Fail safely when rules or clerk data are unavailable.

## Testing Responsibilities

- Documentation service CRUD tests
- Documentation request workflow tests
- Clerk assignment and workload tests
- File validation and authorization tests
- React documentation and career feature tests
- Flutter file picker/camera integration tests
- Documentation Agent structured-output tests
- Missing-document and invalid-service tests
- Sensitive-data access-control tests

---

# Member 4 — Customer Requests, Legal Updates & AI Platform

## Primary Responsibility

Manage customer service requests, legal updates, careers coordination if not assigned to Member 3, Agentic AI orchestration, workflow state, approvals, audit logs, and reporting.

Member 4 owns the shared AI coordination platform. Members 1, 2, and 3 must implement and test their own specialized agents and tools.

## Main Entities

- ServiceRequest
- AgentWorkflow
- AgentStep
- ToolExecution
- ValidationResult
- ApprovalDecision
- ExecutionSummary
- AuditLog
- LegalUpdate
- Career
- JobApplication

Avoid duplicate ownership of Career and JobApplication tables. The team must decide whether Member 3 or Member 4 owns these tables before implementation.

## Backend Responsibilities

### Customer Request APIs

```http
POST /api/service-requests
GET  /api/service-requests
GET  /api/service-requests/{id}
PUT  /api/service-requests/{id}
POST /api/service-requests/{id}/cancel
```

### Agent Workflow APIs

```http
POST /api/agent-workflows/start
GET  /api/agent-workflows/{id}
GET  /api/agent-workflows/{id}/status
GET  /api/agent-workflows/{id}/steps
GET  /api/agent-workflows/{id}/summary
```

### Approval APIs

```http
POST /api/agent-workflows/{id}/approve
POST /api/agent-workflows/{id}/reject
POST /api/agent-workflows/{id}/revise
GET  /api/agent-workflows/{id}/approval-history
```

### Legal Update APIs

```http
POST   /api/legal-updates
GET    /api/legal-updates
GET    /api/legal-updates/{id}
PUT    /api/legal-updates/{id}
DELETE /api/legal-updates/{id}
POST   /api/legal-updates/{id}/publish
POST   /api/legal-updates/{id}/archive
```

### Career APIs

```http
POST /api/careers
GET  /api/careers
GET  /api/careers/{id}
PUT  /api/careers/{id}
DELETE /api/careers/{id}
```

## Legal Updates Feature

Customers should be able to:

- Browse recent legal updates.
- Search by title or legal category.
- Filter by publication date.
- Read law summaries and amendments.
- View official source links.
- Identify publication and update dates.

Admins or authorized staff should be able to:

- Create drafts.
- Review content.
- Publish updates.
- Archive outdated content.
- Maintain source references.

### Legal Content Rules

- Include the original source and publication date.
- Prefer official government or authoritative legal sources.
- Review content before publication.
- Do not present AI-generated summaries as official legal advice.
- Display an appropriate informational disclaimer.
- Store source URLs and content review information where appropriate.

## Agent Workflow Lifecycle

```text
Received
   |
Planning
   |
Delegating
   |
Executing Tools
   |
Validating
   |
Awaiting Approval
   |
   +--> Approved --> Applying Business Action --> Completed
   |
   +--> Rejected --> Rejected
   |
   +--> Revision Required --> Revised Plan
   |
   +--> Validation Failed --> Safe Failure
   |
   +--> Timeout/Error --> Retry or Safe Failure
```

## Assigned Agent: Planning / Coordinator Agent

### Responsibilities

- Receive a structured domain objective.
- Create a multi-step plan.
- Delegate work to specialized agents.
- Track workflow state.
- Collect structured outputs.
- Trigger deterministic validation.
- Pause for human approval when required.
- Produce execution summaries.
- Record audit information.
- Handle failures safely.

## Shared AI Platform Features

- Agent registry
- Allow-listed tool registry
- Input schema validation
- Output schema validation
- Deterministic business-rule validation
- Retry limits
- Timeouts
- Prompt injection resistance
- Safe failure handling
- Structured logging
- Execution timing
- Tool execution records
- Validation results
- Approval decisions
- Error and retry tracking

## React Responsibilities

- Customer request monitoring
- AI workflow dashboard
- Workflow step timeline
- Tool execution summaries
- Validation results
- Approval queue
- Approve, reject, and revise actions
- Legal updates management
- Career management if assigned
- Reporting and analytics
- Audit history
- Protected staff/admin pages

## Flutter Responsibilities

- Submit customer service request
- View request status
- View AI recommendations or proposals
- View workflow progress
- View legal updates
- Browse careers
- Submit job applications if assigned
- View completed results or safe-failure messages
- View request history

## Testing Responsibilities

- Service request CRUD tests
- Workflow state transition tests
- Approval authorization tests
- Audit logging tests
- Legal update publishing tests
- Source and status validation tests
- Career CRUD and application tests if assigned
- Tool allow-list tests
- Input/output schema tests
- Retry and timeout tests
- Prompt injection resistance tests
- Safe-failure tests
- React monitoring and approval tests
- Flutter request and status tests
- End-to-end workflow tests
- Agent evaluation golden cases

---

# 6. Required Cross-Platform Workflow

The system must demonstrate a complete workflow that starts in one client and continues through the other client.

## Example Workflow

```text
1. Customer uses Flutter to submit a legal service request.
2. ASP.NET Core authenticates the customer and validates the request.
3. The request is stored in PostgreSQL.
4. The Coordinator Agent creates a structured plan.
5. The Coordinator delegates to:
   - Lawyer Recommendation Agent
   - Scheduling Agent
   - Documentation Agent when required
6. Agents call only allow-listed backend tools.
7. Structured outputs are validated.
8. The workflow pauses for authorized staff approval.
9. Staff uses the React dashboard to approve, reject, or revise.
10. The backend applies the approved business action.
11. PostgreSQL is updated using the required business rules.
12. Audit logs and execution summaries are stored.
13. Flutter displays the updated status to the customer.
```

## Backend Remains the Final Authority

AI may suggest or assist, but the ASP.NET Core backend must control:

- Authentication
- Authorization
- Business rules
- Database updates
- Transactions
- Final validation
- Audit logging
- Approval enforcement

---

# 7. Shared Security Requirements

## Authentication

- JWT-based authentication
- Secure password hashing
- Login and logout
- Protected API endpoints
- Secure token storage in Flutter
- Protected routes in React

## Authorization

- Role-based access control
- Permission checks
- Customer ownership validation
- Staff and admin restrictions
- Approval actions limited to authorized users
- Private file access restrictions

## Validation

- DTO validation
- Request validation
- Database constraints
- File validation
- AI input and output validation
- Deterministic business-rule validation

## Data Protection

- Never store plain-text passwords.
- Never commit secrets or tokens.
- Do not expose private documents publicly.
- Do not store hidden AI reasoning.
- Do not send unnecessary sensitive data to AI.
- Store only necessary workflow state and execution information.

---

# 8. Database Responsibilities

Each member must contribute to database design and migrations.

## Requirements

- Normalized relational schema
- Primary and foreign keys
- Correct relationships
- Unique constraints
- Check constraints where suitable
- Indexes for common queries
- CreatedAt and UpdatedAt fields
- EF Core migrations
- Seed data
- Transactions
- Referential integrity

## Shared Database Rules

- Avoid duplicate business logic in React and Flutter.
- Use database constraints to protect integrity.
- Add indexes based on query needs.
- Apply migrations consistently.
- Keep production credentials secure.
- Define clear ownership for shared tables before development.

---

# 9. Testing Requirements

## Backend

- Unit tests
- Service-layer tests
- DTO and validation tests
- Authorization tests
- Controller tests
- API integration tests

## Database

- Migration tests
- Relationship tests
- Constraint tests
- Transaction tests
- Seed-data verification

## React

- Component tests
- Form validation tests
- Protected route tests
- API success and failure tests
- Loading and empty states
- Approval and monitoring tests

## Flutter

- Unit tests
- Widget tests
- Form validation tests
- Navigation tests
- Authentication tests
- API integration tests
- Device feature tests

## Agentic AI

Test each agent for:

- Correct planning
- Correct delegation
- Correct tool selection
- Structured outputs
- Invalid input handling
- Invalid tool response handling
- Business-rule validation
- Approval enforcement
- Prompt injection attempts
- Timeout handling
- Retry limits
- Safe failure
- No invented data

## Performance Testing

Where applicable, measure:

- Concurrent API requests
- API response times
- Database response times
- AI workflow latency
- Success and failure rates
- Timeout and retry behavior

---

# 10. Git and Collaboration Guidelines

## Suggested Branch Structure

```text
main
├── develop
├── feature/member1-lawyer-management
├── feature/member2-appointments
├── feature/member3-documentation
└── feature/member4-ai-platform
```

## Example Commits

```text
feat: add lawyer CRUD endpoints
feat: implement appointment conflict validation
feat: add documentation request workflow
feat: implement coordinator agent state machine
feat: add legal updates publishing workflow
test: add appointment double booking tests
fix: correct JWT authorization middleware
docs: update API setup instructions
```

## Pull Request Rules

Each member must:

- Work on feature branches.
- Create meaningful commits.
- Open pull requests.
- Request reviews from other members.
- Resolve review comments.
- Avoid direct commits to main.
- Keep implementation explainable for the viva.
- Maintain visible Git contribution evidence.

## GitHub Project Board

Recommended columns:

- Backlog
- To Do
- In Progress
- Code Review
- Testing
- Done

---

# 11. CI/CD Requirements

GitHub Actions should:

1. Run on pushes.
2. Run on pull requests to main.
3. Restore backend dependencies.
4. Build the ASP.NET Core API.
5. Run backend tests.
6. Report failures clearly.

Additional React and Flutter checks may be added.

---

# 12. Deployment Requirements

The final project should include:

- Deployed ASP.NET Core API
- Health endpoint
- Swagger/OpenAPI URL
- Secure PostgreSQL database
- Applied migrations
- Deployed React application
- React connected to the deployed API
- Flutter APK
- AI service deployment or startup instructions
- Secure environment variables
- No secrets committed to GitHub

All links should be tested in an incognito/private browser session before submission.

---

# 13. Definition of Done

Each member's component is complete when the member has:

- [ ] Designed and implemented domain entities.
- [ ] Created EF Core configurations and migrations.
- [ ] Implemented DTOs.
- [ ] Implemented service/application logic.
- [ ] Implemented REST controllers.
- [ ] Added authentication and authorization.
- [ ] Added validation and error handling.
- [ ] Implemented React features.
- [ ] Implemented Flutter features.
- [ ] Implemented and tested the assigned AI agent.
- [ ] Added unit and integration tests.
- [ ] Created meaningful Git commits and pull requests.
- [ ] Updated documentation.
- [ ] Maintained an AI usage log.
- [ ] Demonstrated integration with the shared workflow.

---

# 14. Responsibility Summary

| Member | Primary Component | Agent | React Focus | Flutter Focus |
|---|---|---|---|---|
| Member 1 | Lawyer & Legal Service Management | Lawyer Recommendation Agent | Lawyer profiles, services, specializations, availability | Lawyer discovery and profile browsing |
| Member 2 | Booking & Appointment Management | Scheduling Agent | Appointment dashboard, confirmation, rescheduling, history | Booking, slots, cancellation, status |
| Member 3 | Clerk & Documentation Management | Documentation Agent | Documentation requests, clerks, files, careers if assigned | Request submission, file upload, tracking |
| Member 4 | Customer Requests, Legal Updates & AI Platform | Planning / Coordinator Agent | AI monitoring, approval, legal updates, careers, reporting | Requests, workflow status, legal updates, careers |

---

# 15. Final Project Success Criteria

The final system should demonstrate that:

- Customers can discover and select lawyers.
- Customers can request appointments.
- Clerks can process documentation requests.
- Customers can upload and track documents securely.
- Customers can read verified legal updates.
- Customers can view and apply for career opportunities.
- React and Flutter use the same backend API.
- Authentication and permissions work consistently.
- PostgreSQL stores reliable relational data.
- Specialized AI agents have distinct responsibilities.
- The Coordinator Agent delegates tasks correctly.
- AI tools are allow-listed and validated.
- Human approval is required for high-impact actions.
- Workflow state and audit records are persisted.
- Tests, Git history, CI, and deployment evidence are available.
- Every member can explain and modify their contribution during the viva.
