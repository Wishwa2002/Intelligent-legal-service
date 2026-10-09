# SE3090: Software Testing & Quality Evaluation
## COMPREHENSIVE DEFECT / BUG REPORT & RETESTING EVIDENCE

**System Under Test:** Intelligent Legal Service Platform (ILS)  
**Defects Recorded:** 4 Critical System Defects  
**Resolution Rate:** 100% Resolved & Verified (0 Active Defects)  

---

### DEFECT SUMMARY MATRIX

| Defect ID | Feature Area | Severity / Priority | Brief Description | Root Cause | Fix Applied | Retest Status | Student Owner |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **DEF-01** | Booking REST API | **Critical / High** | `POST /api/appointments` returns `HTTP 401 Unauthorized` during AI scheduling. | Class-level `[Authorize]` attribute on `AppointmentsController.cs` blocked guest bookings. | Added `[AllowAnonymous]` to `BookAppointment` endpoint. | **VERIFIED FIXED (PASS)** | Student 2 |
| **DEF-02** | AI Scheduling | **High / High** | Prompts requesting "tomorrow evening" returned morning times (9:30 AM). | Default lawyer working schedule `EndTime` was set to `17:00` (5 PM) in seed data. | Updated `LawyerScheduleBackfill.cs` to set `EndTime = 20:00` (8 PM). | **VERIFIED FIXED (PASS)** | Student 2 |
| **DEF-03** | Intent Classifier | **Medium / High** | "renew house agreement" failed category extraction in fallback mode. | `classifier.py` keyword list lacked `"house"`, `"agreement"`, `"tenancy"`, `"apartment"`. | Added property keywords to fallback classifier list in `classifier.py`. | **VERIFIED FIXED (PASS)** | Student 1 |
| **DEF-04** | DB Schema | **Critical / High** | Foreign key join failed between `DispatchTask` and `Resource`. | Entity type mismatch: `DispatchTask.ResourceId` was `Guid?` while `Resource.Id` was `int`. | Executed EF Core migration `UnifyDispatchTaskResourceId` unifying key to `int?`. | **VERIFIED FIXED (PASS)** | Student 3 |

---

### DETAILED DEFECT REPORTS & RETEST EVIDENCE

#### DEFECT #01: HTTP 401 Unauthorized Error on Booking API Endpoint
* **Defect ID**: `DEF-01`
* **Subsystem**: Booking & Appointment Management (`backend/LegalService.API`)
* **Severity**: Critical | **Priority**: High
* **Symptom**: When a client selected a booking option chip on the mobile app or web interface, the system threw the error:
  `⚠️ We encountered an issue while locking in your booking: POST /api/appointments failed with HTTP 401.`
* **Steps to Reproduce**:
  1. Input scheduling query: *"I need a criminal lawyer tomorrow evening between 5 and 8 PM"*.
  2. Tap `[ Option 1: Lawyer A (6:00 PM Phone) ]`.
  3. The API client dispatches `POST /api/appointments`.
  4. Response received: `HTTP 401 Unauthorized`.
* **Root Cause Analysis**:
  `AppointmentsController.cs` had a class-level `[Authorize]` attribute. While `available-slots` and `check-conflict` endpoints had `[AllowAnonymous]`, `BookAppointment` inherited class-level authorization without an explicit allowance, rejecting non-JWT AI guest bookings.
* **Code Fix Applied**:
  ```csharp
  // Modified: backend/LegalService.API/Controllers/AppointmentsController.cs
  [AllowAnonymous]
  [HttpPost]
  public async Task<IActionResult> BookAppointment([FromBody] BookAppointmentRequest request)
  ```
* **Retesting Evidence**:
  Executed `curl.exe -X POST http://localhost:5000/api/appointments -H "Content-Type: application/json" -d "{}"`.
  * **Before Fix**: `HTTP 401 Unauthorized`
  * **After Fix**: `HTTP 400 Bad Request` (Payload validation error, proving authentication passed!)
  * **Automated xUnit Retest**: `AppointmentsControllerTests.BookAppointment_AllowsAnonymousBookingForAIAgent` -> **PASSED**.

---

#### DEFECT #02: Evening Slot Search Query Returning Morning Times
* **Defect ID**: `DEF-02`
* **Subsystem**: AI Scheduling Agent (`ai-service` & `backend/LegalService.API`)
* **Severity**: High | **Priority**: High
* **Symptom**: Client asked for evening slots between 5 PM and 8 PM (*17:00–20:00*), but the system returned morning slots (*9:00 AM*, *9:30 AM*, *10:00 AM*).
* **Steps to Reproduce**:
  1. Input query: *"I need a criminal lawyer tomorrow evening between 5pm and 8 PM"*.
  2. Agent output message displayed:
     `*Note: No open slots in requested window (17:00–20:00). Displaying closest available slots... 9:30 AM, 10:00 AM*`.
* **Root Cause Analysis**:
  In `LawyerScheduleBackfill.cs` and `DemoLawyerSeeder.cs`, default working schedules for lawyers were seeded with `StartTime = 09:00` and `EndTime = 17:00` (5 PM). Since working hours ended at 5 PM, 0 available slots existed between 5 PM and 8 PM.
* **Code Fix Applied**:
  ```csharp
  // Modified: backend/LegalService.API/Data/LawyerScheduleBackfill.cs
  public const string ScheduleSql = """
      INSERT INTO "LawyerWorkingSchedules"
        ("Id", "LawyerId", "DayOfWeek", "StartTime", "EndTime", "IsWorkingDay", "CreatedAt")
      SELECT md5(l."LawyerId"::text || ':default-weekly:' || d.day)::uuid,
        l."LawyerId", d.day, TIME '09:00', TIME '20:00', d.day BETWEEN 1 AND 5, NOW()
      FROM "Lawyers" l CROSS JOIN generate_series(0, 6) AS d(day)
      WHERE NOT EXISTS (SELECT 1 FROM "LawyerWorkingSchedules" s WHERE s."LawyerId" = l."LawyerId");
      """;
  ```
* **Retesting Evidence**:
  Executed `scratch/test_scheduling_flow.py`.
  * **Before Fix**: Returned 9:30 AM morning slots.
  * **After Fix**: Returned `1. Naveen Rajendran - Time: 5:30 PM`, `2. Naveen Rajendran - Time: 6:00 PM`.
  * **Pytest Retest**: `test_scheduling_flow.py` -> **PASSED**.

---

#### DEFECT #03: Intent Classifier Fallback Category Extraction Failure
* **Defect ID**: `DEF-03`
* **Subsystem**: Lawyer Recommendation Agent (`ai-service/app/agents/scheduling/classifier.py`)
* **Severity**: Medium | **Priority**: High
* **Symptom**: When a client typed *"i want to renew my house agreement, can you find lawyer tomorrow evening"*, rule-based fallback classification failed to detect `Real Estate & Property Law`.
* **Steps to Reproduce**:
  1. Input query: *"i want to renew my house agreement, can you find lawyer tomorrow evening"*.
  2. Agent prompt response: *"Could you clarify which legal area your inquiry belongs to..."*
* **Root Cause Analysis**:
  In `classifier.py`, the fallback keyword array for `Real Estate & Property Law` contained `["land", "property", "lease", "rent", "tenant", "deed", "evict"]`, missing `"house"`, `"tenancy"`, `"apartment"`, `"agreement"`.
* **Code Fix Applied**:
  ```python
  # Modified: ai-service/app/agents/scheduling/classifier.py
  elif any(k in text_lower for k in ["land", "property", "lease", "rent", "tenant", "deed", "evict", "house", "tenancy", "apartment", "agreement", "title"]):
      state["legal_category"] = "Real Estate & Property Law"
  ```
* **Retesting Evidence**:
  Executed `scratch/test_scheduling_flow.py` test case 6.
  * **Extracted Category**: `Real Estate & Property Law`
  * **Target Date**: `2026-10-06` | **Time Window**: `17:00 to 20:00`
  * **Retest Status**: **PASSED**.

---

#### DEFECT #04: Database Foreign Key Mismatch Between Task & Resource Entities
* **Defect ID**: `DEF-04`
* **Subsystem**: Documentation & Database (`backend/LegalService.API`)
* **Severity**: Critical | **Priority**: High
* **Symptom**: Entity Framework database migration threw mapping exception during clerk task assignment.
* **Root Cause Analysis**:
  `DispatchTask.ResourceId` was configured as `Guid?`, whereas `Resource.Id` primary key was an auto-incrementing `int`.
* **Code Fix Applied**:
  Authored and applied EF Core migration `20260926062717_UnifyDispatchTaskResourceId`, updating `DispatchTask.ResourceId` to `int?`.
* **Retesting Evidence**:
  Ran `dotnet ef database update` and executed xUnit integration suite.
  * **Retest Status**: **PASSED**.
