# TriageSync – Support Ticket Triage and Resource Slot Scheduling System

TriageSync is a production-grade full-stack web application for support operations. It combines deterministic AI-based customer ticket triage, SLA urgency scoring, and atomic, conflict-free resource slot booking (rooms, labs, and equipment) with PostgreSQL row-level concurrency protection.

---

## 1. Project Overview

Modern technical support workflows often suffer from two major bottlenecks:
1. **Unstructured Customer Tickets**: Inquiries arrive across diverse topics (billing disputes, critical outages, auth lockouts, hardware shipments) without reliable classification, leading to delayed escalations.
2. **Resource Scheduling Conflicts**: Engineering facilities, diagnostic testbenches, and client meeting suites encounter race conditions when multiple technicians or customers attempt to reserve the same slot simultaneously.

**TriageSync** solves both challenges:
- **Deterministic Triage Pipeline**: Ingests support inquiries, performs deterministic keyword classification across 5 categories (`BILLING`, `LOGIN`, `DELIVERY`, `BUG`, `FEATURE_REQUEST`), calculates SLA urgency, tracks model-agreement telemetry, and protects human agent overrides during automated re-imports.
- **Atomic Slot Scheduler**: Enforces strict 30-minute UTC time grid alignment, duration bounds (30–240 minutes), user active booking quotas (max 3), and serializes concurrent slot reservations using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside atomic transactions.

---

## 2. Live Application Links

| Component | Status | URL |
|---|---|---|
| **Web Frontend (UI)** | Local Development / Pending Cloud Deployment | `http://localhost:5173` |
| **Backend REST API** | Local Development / Pending Cloud Deployment | `http://localhost:5001/api` |
| **Health Check** | Operational | `http://localhost:5001/api/health` |

> *Note: Production cloud deployment instructions (Docker, Render, Railway, Vercel) are provided in Section 6 below.*

---

## 3. Seeded Credentials

The database seed creates two deterministic accounts matching the assessment specification:

| Role | Email | Password | Privileges |
|---|---|---|---|
| **ADMIN** | `admin@triagesync.test` | `Admin@123` | Full access: Admin telemetry, facility resource CRUD, booking approvals/rejections, triage queue |
| **USER** | `user@triagesync.test` | `User@123` | Standard access: Triage queue review, resource availability inspection, slot booking, personal booking cancellation |

*Passwords are hashed with bcrypt (cost factor 12). Public registration strictly creates `USER` accounts; `ADMIN` accounts can only be provisioned via the seed script.*

---

## 4. Technology Stack

- **Frontend**:
  - React 18 with TypeScript
  - Vite build tool
  - Tailwind CSS with custom SaaS dashboard theme
  - React Router v6
  - Lucide React icon library
- **Backend**:
  - Node.js (ES Modules) with Express
  - TypeScript (strict mode, zero build warnings)
  - PostgreSQL 16
  - Prisma ORM 5.x
  - Zod for runtime schema validation
  - JWT (JSON Web Tokens) with 24-hour expiration
  - bcryptjs (cost 12) for secure password hashing
- **Testing & Tooling**:
  - `tsx` for high-performance TypeScript execution
  - Native Node `perf_hooks` for latency benchmarking
  - Docker & Docker Compose for multi-container orchestration

---

## 5. Folder Structure

```text
triagesync/
├── .env.example                  # Environment template with safe placeholders
├── .gitignore                    # Git ignore policy
├── README.md                     # Comprehensive documentation
├── SOLUTION.md                   # Architecture, concurrency, benchmarks, and roadmap
├── AI_USAGE.md                   # AI tooling usage and personal verification log
├── docker-compose.yml            # Multi-container orchestration (DB, API, Web)
├── package.json                  # Root scripts with concurrently runner
├── backend/
│   ├── Dockerfile                # Production multi-stage Docker build
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma schema with enums, models, indexes
│   │   ├── seed.ts               # Idempotent database seed script
│   │   └── migrations/           # Version-controlled SQL migration scripts
│   └── src/
│       ├── app.ts                # Express application factory & middleware setup
│       ├── server.ts             # Server entry point (port 5001)
│       ├── config/               # Environment variable validation
│       ├── controllers/          # Express route controllers
│       ├── middleware/           # Auth, RBAC, Zod validation, error handling
│       ├── prisma/               # Prisma client singleton
│       ├── routes/               # Modular Express API routers
│       ├── services/             # Core business logic (triage, bookings, resources)
│       ├── types/                # Express request extensions
│       ├── utils/                # Custom error hierarchy, sanitizer, response helpers
│       └── validators/           # Zod schemas (auth, tickets, resources, bookings)
└── frontend/
    ├── Dockerfile                # Production Nginx SPA Docker build
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx               # Main routing & application shell
        ├── main.tsx              # React DOM entry point
        ├── components/           # UI components (Header, Sidebar, Badge, Button, ProtectedRoute)
        ├── contexts/             # AuthContext with token session persistence
        ├── hooks/                # Health check and telemetry hooks
        ├── layouts/              # AppLayout with responsive sidebar drawer
        ├── pages/                # Dashboard, Tickets, Resources, MyBookings, Admin, Login, Register
        ├── services/             # Typed API client (apiClient)
        ├── types/                # Shared TypeScript interfaces & enums
        └── utils/                # Date/time formatters and Tailwind cn helper
```

---

## 6. Local Setup and Installation

### Prerequisites
- Node.js 20+ and npm 10+
- PostgreSQL 14+ running locally (or via Docker)

### Step 1: Clone and Install Dependencies
```bash
cd /Users/manishsingh/Desktop/TriageSync

# Install root, backend, and frontend dependencies
npm run install:all
```

### Step 2: Configure Environment Variables
Copy `.env.example` into `backend/.env` and `frontend/.env`:

```bash
# Backend environment (backend/.env)
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/triagesync?schema=public
JWT_SECRET=production_jwt_secret_must_be_at_least_32_characters_long
JWT_EXPIRES_IN=24h

# Frontend environment (frontend/.env)
VITE_API_BASE_URL=http://localhost:5001/api
```

*(Note: Port 5001 is used by default to prevent port conflicts with macOS ControlCenter / AirPlay Receiver on port 5000).*

### Step 3: Run Database Migrations and Seed
```bash
# Apply Prisma migrations
cd backend
npx prisma migrate dev --name init

# Run idempotent database seed
npm run db:seed
```

### Step 4: Run the Application
From the repository root, launch both frontend and backend concurrently:
```bash
npm run dev
```

- Web UI: `http://localhost:5173`
- Backend API: `http://localhost:5001/api`
- API Health Check: `http://localhost:5001/api/health`

### Alternative: Run with Docker Compose
```bash
docker-compose up --build
```

---

## 7. Database Schema

The database schema is defined in [`backend/prisma/schema.prisma`](file:///Users/manishsingh/Desktop/TriageSync/backend/prisma/schema.prisma) with 7 enums and 5 relational models:

```mermaid
erDiagram
    User ||--o{ Ticket : "assignedTickets"
    User ||--o{ Booking : "bookings"
    Ticket ||--o{ TicketEvent : "events"
    Ticket ||--o{ Booking : "bookings"
    Resource ||--o{ Booking : "bookings"

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        Role role
        datetime createdAt
    }

    Ticket {
        string id PK
        string externalId UK
        string subject
        string body
        TicketCategory autoCategory
        TicketCategory category
        boolean isHumanOverride
        TicketPriority priority
        TicketStatus status
        string assigneeId FK
        boolean isReviewed
        datetime createdAt
        datetime updatedAt
    }

    TicketEvent {
        string id PK
        string ticketId FK
        TicketEventField field
        string oldValue
        string newValue
        string actor
        datetime createdAt
    }

    Resource {
        string id PK
        string name UK
        ResourceType type
        int capacity
        string description
        boolean isActive
        datetime createdAt
    }

    Booking {
        string id PK
        string resourceId FK
        string userId FK
        string ticketId FK
        datetime startTime
        datetime endTime
        string purpose
        BookingStatus status
        string decisionNote
        datetime createdAt
    }
```

### Key Schema Constraints:
- Case-insensitive unique indexes on `User.email` and `Resource.name`.
- Composite conflict index on `Booking(resourceId, startTime, endTime)`.
- Foreign key constraints: `ON DELETE RESTRICT` on `Booking.resourceId`, `CASCADE` on `Booking.userId`, `SET NULL` on `Booking.ticketId`.

---

## 8. API Summary

All endpoints require JWT Bearer authentication except `/api/health`, `/api/auth/register`, and `/api/auth/login`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Service status, uptime, and environment check |
| `POST` | `/api/auth/register` | Public | Register user (`role: USER` strictly enforced) |
| `POST` | `/api/auth/login` | Public | Authenticate credentials; returns JWT (expires ≤24h) |
| `GET` | `/api/auth/me` | Authenticated | Current user profile (`passwordHash` omitted) |
| `POST` | `/api/tickets/import` | Authenticated | Idempotent ticket batch ingestion with auto-classification |
| `GET` | `/api/tickets` | Authenticated | Paginated ticket queue (`status`, `category`, `priority`, `q`) |
| `GET` | `/api/tickets/:id` | Authenticated | Ticket details with audit event history |
| `PATCH` | `/api/tickets/:id` | Authenticated | Update ticket attributes; logs audit events in `TicketEvent` |
| `GET` | `/api/stats` | Authenticated | Ticket telemetry & model agreement rate |
| `GET` | `/api/resources` | Authenticated | List resources (active only for USER, all for ADMIN) |
| `GET` | `/api/resources/:id` | Authenticated | Resource detail (inactive returns 404 for USER) |
| `POST` | `/api/resources` | **ADMIN only** | Create resource with unique name check (201 / 409) |
| `PATCH` | `/api/resources/:id` | **ADMIN only** | Partial resource update (name, capacity, isActive) |
| `GET` | `/api/resources/:id/availability` | Authenticated | Date slot availability with privacy projection |
| `POST` | `/api/bookings` | Authenticated | Create booking (`PENDING`, atomic row-lock serialization) |
| `GET` | `/api/bookings/mine` | Authenticated | Paginated personal bookings (`status`, newest first) |
| `GET` | `/api/bookings` | **ADMIN only** | All organizational bookings with date overlap filter |
| `GET` | `/api/bookings/:id` | Owner / ADMIN | Booking details (USER receives 403 on other users' bookings) |
| `PATCH` | `/api/bookings/:id/cancel` | **Owner only** | Owner cancellation for future `PENDING`/`APPROVED` slots |
| `PATCH` | `/api/bookings/:id/approve` | **ADMIN only** | Approve future `PENDING` booking (status → `APPROVED`) |
| `PATCH` | `/api/bookings/:id/reject` | **ADMIN only** | Reject future `PENDING` booking with 5–200 char note |
| `GET` | `/api/admin/stats` | **ADMIN only** | Admin metrics: active resources, status counts, top 3 resources |

---

## 9. Completed Features Checklist

- [x] Monorepo architecture with clean ES Module backend and Vite frontend
- [x] PostgreSQL database integration via Prisma ORM
- [x] Secure authentication with bcrypt (cost 12) and JWT (24h expiry)
- [x] Role-Based Access Control (RBAC: USER and ADMIN)
- [x] Deterministic keyword classification engine (`BILLING`, `LOGIN`, `DELIVERY`, `BUG`, `FEATURE_REQUEST`)
- [x] Idempotent ticket batch import (`POST /api/tickets/import`) preserving human overrides
- [x] Parameterized, SQL-injection-safe ticket search and multi-field filters
- [x] Ticket audit trail tracking actor attribution in `TicketEvent`
- [x] Model Agreement Rate calculation comparing predicted vs actual categories
- [x] Resource management with case-insensitive unique naming and active/inactive gating
- [x] Privacy-preserving availability API (exposes only `startTime`, `endTime`, `status`)
- [x] 30-minute UTC grid enforcement and 30–240 minute duration constraints
- [x] **Atomic PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) preventing slot double-booking**
- [x] Maximum 3 future active bookings per user limit
- [x] Verified 10-concurrent-requests overlap test (strictly 1 × 201, 9 × 409)
- [x] Owner-only booking cancellation with confirmation modal
- [x] ADMIN booking approval and rejection workflow with mandatory decision notes
- [x] Real-time Admin Telemetry dashboard (`/api/admin/stats`)
- [x] **Optimistic UI on ticket review** with automatic state rollback on network failure
- [x] Safe HTML escaping preventing stored XSS injection
- [x] Responsive layout tested across 375px, 768px, and 1280px viewports
- [x] Idempotent database seed script with deterministic assessment accounts

---

## 10. Known Limitations

1. **Email / SMS Notifications**: Currently, booking status changes (approvals, rejections, cancellations) update the database and UI in real time, but do not dispatch outbound SMTP emails or SMS alerts.
2. **Calendar Synchronization**: Slot schedules cannot currently be synced directly to external calendar providers (Google Calendar / Outlook iCal feeds).
3. **Full-Text Search Engine**: Free-text search on tickets uses PostgreSQL parameterized `ILIKE` pattern matching. For massive ticket volumes (>1,000,000 records), migrating to PostgreSQL `tsvector` / GIN indexing or an external search engine (Elasticsearch / Meilisearch) is recommended.
