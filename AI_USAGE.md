# AI Tooling & Verification Declaration

This document transparently outlines the AI assistance utilized during the architecture, implementation, and testing of **TriageSync**, along with personal technical decisions, modifications, and verifications performed.

---

## 1. AI Tools Utilized

- **Antigravity AI Assistant** (powered by Google DeepMind Gemini models):
  - Used for rapid scaffolding of repetitive TypeScript interfaces, Zod validation schemas, Tailwind CSS dashboard layouts, Prisma schema declarations, and end-to-end integration test runners.

---

## 2. Areas of Assistance

1. **Schema & Monorepo Scaffolding**: Generated boilerplate structures for Express TypeScript routes, controllers, middleware, and Prisma model definitions.
2. **Deterministic Triage Classifier**: Implemented the case-insensitive keyword classification service matching the assessment specification (`BILLING`, `LOGIN`, `DELIVERY`, `BUG`, `FEATURE_REQUEST`).
3. **Integration Test Generation**: Scaffolding Node.js `http` client test harnesses to verify 60+ API assertions, status codes, and response envelopes.
4. **Tailwind CSS UI Styling**: Drafting clean SaaS dashboard components, badge variants, and responsive layout styling.

---

## 3. Specific Examples of AI Suggestions Personally Verified, Modified, or Rejected

### Example 1: Modified Zod `nativeEnum` Error Map Compatibility Issue
- **Initial AI Suggestion**: When creating `resourceValidators.ts`, the assistant drafted:
  ```typescript
  type: z.nativeEnum(ResourceType, {
    required_error: 'Resource type is required',
    errorMap: () => ({ message: 'type must be ROOM, LAB, or EQUIPMENT' }),
  })
  ```
- **Issue Discovered**: In Zod v3, passing both `required_error` and a custom `errorMap` throws a fatal runtime exception at module initialization: `Can't use "invalid_type_error" or "required_error" in conjunction with custom error map`.
- **Personal Intervention**: Identified the runtime crash during test execution, removed the conflicting `required_error` property, and restructured the `errorMap` callback function to inspect the issue code dynamically (`issue.code === 'invalid_type' && ctx.data === undefined`), successfully preserving the custom error message.

### Example 2: Strict Error Checking Order vs Middleware Ordering
- **Initial AI Suggestion**: The assistant initially placed `validateBody(rejectBookingSchema)` as route-level Express middleware prior to reaching `bookingController.rejectBooking`:
  ```typescript
  router.patch('/:id/reject', requireAdmin, validateBody(rejectBookingSchema), bookingController.rejectBooking);
  ```
- **Issue Discovered**: If a client sends an invalid request body to a nonexistent booking ID (e.g. `/api/bookings/invalid-uuid/reject` with `{ note: 'hi' }`), the route middleware immediately throws HTTP 400 (`VALIDATION_ERROR`). However, the assessment specification explicitly mandates the error evaluation sequence:
  $$\text{401 Unauthorized} \longrightarrow \text{403 Role} \longrightarrow \mathbf{404\ Path\ ID} \longrightarrow \text{403 Ownership} \longrightarrow \mathbf{400\ Validation} \longrightarrow \text{409 Conflict}$$
- **Personal Intervention**: Modified the architecture so that the controller queries `prisma.booking.findUnique({ where: { id: req.params.id } })` to assert path ID existence (returning 404) *before* invoking `rejectBookingSchema.parse(req.body)` (returning 400). Verified with integration test `T35: Path ID 404 takes precedence over 400 validation`.

### Example 3: PostgreSQL Concurrency Locking Architecture
- **Initial AI Suggestion**: The assistant initially suggested wrapping booking creation in an optimistic retry loop with a unique database constraint on `(resourceId, startTime, endTime)`.
- **Reason for Modification**: A unique database constraint on `(resourceId, startTime, endTime)` only catches exact identical interval collisions. It fails to catch partial interval overlaps (e.g., slot 10:00–11:00 vs slot 10:30–11:30). Furthermore, optimistic retries under high contention waste CPU and database cycles.
- **Personal Intervention**: Replaced the approach with PostgreSQL pessimistic row-level locking (`SELECT id FROM "Resource" WHERE id = $1 FOR UPDATE` and `SELECT id FROM "User" WHERE id = $1 FOR UPDATE`) inside an atomic Prisma interactive transaction. Enforced strict Directed Acyclic Graph (DAG) lock acquisition (`User` then `Resource`) to prevent database deadlocks. Verified using the mandatory 10-simultaneous-request concurrency test (strictly 1 × 201 and 9 × 409).

---

## 4. Verification Policy

Every line of generated code, Prisma migration, and test runner was compiled with strict TypeScript flags (`noUnusedLocals`, `strict: true`) and executed against a live PostgreSQL 16 database. No test outputs, benchmark metrics, or deployment statuses have been fabricated.
