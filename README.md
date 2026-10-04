# Autonomous Enterprise Hotel & Hospitality Operations Platform (Backend API Control Plane)

[![Node.js](https://img.shields.io/badge/Node.js-v22%20LTS-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.x-blue.svg)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v6.x%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16%20%2B%20pgvector-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v6.x%20ORM-indigo.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

A production-grade, enterprise-ready Node.js + TypeScript backend engineered for modern hotel and resort operations. It features atomic concurrency guarantees to eliminate double-bookings, an in-database semantic RAG engine (PostgreSQL `pgvector` + OpenAI embeddings), a multi-gateway payment strategy (Stripe & SSLCommerz), and a Human-in-the-Loop (HITL) Autonomous AI Operations Agent with Server-Sent Events (SSE) streaming.

---

## 🌟 Architectural Highlights & Core Guarantees

- **Zero Double-Booking Guarantee**: Concurrency locks using date-range overlap math (`checkInDate < requestedCheckOut AND checkOutDate > requestedCheckIn`) executed inside PostgreSQL atomic transactions (`prisma.$transaction`).
- **In-Database Semantic RAG Engine**: Native vector similarity search utilizing PostgreSQL `pgvector` (`<=>` cosine distance operator) combined with OpenAI `text-embedding-3-small` and `gpt-4o-mini` with strict context synthesis and local mock fallbacks.
- **Multi-Gateway Payment Strategy**: Strategy pattern implementation supporting **Stripe Checkout** and **SSLCommerz**, with raw-body signature verification webhooks and idempotent payment state transitions.
- **Human-in-the-Loop (HITL) Agentic Workflow**: ReAct autonomous operations agent equipped with deterministic tool execution (`check_room_availability`, `assign_housekeeping_task`, `calculate_rate_delta`) and SSE real-time log streaming. Destructive actions trigger an `AWAITING_APPROVAL` state requiring explicit staff authorization.
- **Decoupled Modular Architecture**: Clean separation of concerns with domain modules (`auth`, `room`, `booking`, `payment`, `rag`, `agent`), shared error handlers, Zod schema validation, and typed response formatters.
- **Production Containerization**: Multi-stage Docker build producing a hardened Alpine image (<150MB) running as a non-root system user (`expressjs:1001`) with Docker Compose health checks.

---

## 🏗 System Architecture & Modular Layout

```
nh-hotel-backend/
├── prisma/
│   ├── migrations/               # PostgreSQL schema migration history
│   ├── schema/                   # Modular multi-file schema folder
│   │   ├── base.prisma           # Datasource, pgvector, and generator config
│   │   ├── enums.prisma          # UserRole, RoomStatus, BookingStatus, PaymentStatus, etc.
│   │   ├── user.prisma           # User and Session models
│   │   ├── room.prisma           # RoomType and Room models
│   │   ├── booking.prisma        # Booking model
│   │   ├── payment.prisma        # Payment model
│   │   ├── housekeeping.prisma   # HousekeepingTask model
│   │   ├── rag.prisma            # DocumentChunk vector model
│   │   ├── agent.prisma          # AgentRun and AgentStep models
│   │   └── audit.prisma          # AuditLog model
│   └── seed.ts                   # Database seed script for roles, rooms, and RAG docs
├── src/
│   ├── config/                   # Strongly-typed environment & DB singleton
│   │   ├── env.ts
│   │   └── db.ts
│   ├── shared/                   # Core application utilities
│   │   ├── AppError.ts           # Custom operational error class
│   │   ├── catchAsync.ts         # Async request handler wrapper
│   │   ├── sendResponse.ts       # Generic API response formatter
│   │   └── validateRequest.ts    # Zod middleware validator
│   ├── middlewares/              # Express middlewares
│   │   ├── auth.middleware.ts    # Session authentication & RBAC authorization
│   │   ├── globalErrorHandler.ts # Centralized Express error handler
│   │   └── notFound.ts           # 404 route handler
│   ├── modules/                  # Feature domain modules
│   │   ├── auth/                 # Authentication & Session Management
│   │   ├── room/                 # Room Types & Physical Inventory
│   │   ├── booking/              # Reservation Engine & Concurrency Locks
│   │   ├── payment/              # Gateway Adapters (Stripe / SSLCommerz)
│   │   ├── rag/                  # Vector Ingestion & AI Concierge
│   │   └── agent/                # Autonomous ReAct Agent & SSE Stream
│   ├── app.ts                    # Express app initialization & route mounting
│   └── server.ts                 # HTTP server bootstrap & port listener
├── scripts/
│   └── verify-system.ts          # Automated integration & concurrency verification script
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # Postgres (pgvector), Redis, and API orchestration
├── api-test.http                 # Executable HTTP REST Client test suite
├── package.json
└── tsconfig.json
```

---

## 🗄 Database Domain Models

| Domain File | Models / Enums | Key Fields & Responsibilities |
| :--- | :--- | :--- |
| `enums.prisma` | `UserRole`, `RoomStatus`, `BookingStatus`, `PaymentStatus`, `PaymentProvider`, `AgentRunStatus` | Defines all system enums across domains. |
| `user.prisma` | `User`, `Session` | User accounts, hashed passwords, RBAC roles, and active HTTP session tokens. |
| `room.prisma` | `RoomType`, `Room` | Categories (Deluxe, Suite), pricing, capacity, amenities, and physical room inventory across floors. |
| `booking.prisma` | `Booking` | Reservations, booking codes (`BK-XXXX`), date ranges, total amounts, and statuses. |
| `payment.prisma` | `Payment` | Transaction records, provider linkage, amounts, and transaction IDs. |
| `housekeeping.prisma` | `HousekeepingTask` | Cleaning priorities (1-3), completion states, assigned staff, and room linkage. |
| `rag.prisma` | `DocumentChunk` | Semantic knowledge chunks with `pgvector` 1536-dim embeddings. |
| `agent.prisma` | `AgentRun`, `AgentStep` | Autonomous agent execution logs, tool inputs/outputs, and HITL approval states. |
| `audit.prisma` | `AuditLog` | Enterprise audit trail for administrative and system actions. |

---

## ⚙️ Quick Start & Local Development Setup

### 1. Prerequisites
- **Node.js**: v22.x LTS
- **Docker & Docker Compose** (for PostgreSQL `pgvector` and Redis)

### 2. Installation & Configuration
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-org/nh-hotel-backend.git
cd nh-hotel-backend
npm install
```

Copy the environment configuration template:

```bash
cp .env.example .env
```

### 3. Infrastructure & Database Initialization
Start PostgreSQL with `pgvector` and Redis containers:

```bash
docker compose up -d postgres redis
```

Run database migrations:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

Seed the database with default roles, room types, physical rooms, and RAG knowledge chunks:

```bash
npx prisma db seed
```

### 4. Run Development Server
Start the development server with live reload:

```bash
npm run dev
```

The API server will be available at `http://localhost:5000`.

### 5. Automated Verification Script
Run the automated system verification script to check environment parsing, date overlap concurrency logic, and vector embedding cosine similarity math:

```bash
npm run test:verify
```

---

## 🔐 Pre-Seeded Default Accounts

For immediate testing, the database seed script generates four default accounts (Password for all: `Password123!`):

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@hotel.com` | `Password123!` | Full System & Administrative Control |
| **FRONT_DESK** | `frontdesk@hotel.com` | `Password123!` | Reservations, Check-In / Check-Out, Room Inventory |
| **HOUSEKEEPING** | `cleaner@hotel.com` | `Password123!` | Task Management & Room Cleaning Status |
| **GUEST** | `guest@example.com` | `Password123!` | Public & Personal Reservations, AI Concierge |

---

## 📡 API Endpoint Reference

### 🔑 Authentication Module (`/api/v1/auth`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register a new guest account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & set `session_token` cookie |
| `POST` | `/api/v1/auth/logout` | Authenticated | Destroy active session & clear cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve profile of currently logged-in user |

### 🏨 Room & Inventory Module (`/api/v1/rooms`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/rooms/types` | Public | Paginated list of room types with price/capacity filters |
| `GET` | `/api/v1/rooms/types/:slug` | Public | Detailed view of a room type by slug |
| `POST` | `/api/v1/rooms/types` | Admin / Super Admin | Create a new room type |
| `GET` | `/api/v1/rooms` | Staff / Admin | List all physical rooms with status and floor |
| `POST` | `/api/v1/rooms` | Admin / Super Admin | Create a new physical room |
| `PATCH` | `/api/v1/rooms/:id/status` | Staff / Admin | Update physical room status (`VACANT_CLEAN`, `VACANT_DIRTY`, etc.) |

### 📅 Booking Engine Module (`/api/v1/bookings`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/bookings/availability` | Public | Check room availability for date range |
| `POST` | `/api/v1/bookings` | Authenticated | Create a new room reservation (Transactional lock) |
| `GET` | `/api/v1/bookings/me` | Authenticated | List reservations for the logged-in guest |
| `GET` | `/api/v1/bookings/:id` | Authenticated (Owner/Staff) | Get reservation details |
| `PATCH` | `/api/v1/bookings/:id/cancel` | Authenticated (Owner/Staff) | Cancel a pending or confirmed reservation |
| `PATCH` | `/api/v1/bookings/:id/status` | Staff / Admin | Transition booking status (`CHECKED_IN`, `CHECKED_OUT`) |

### 💳 Payment Module (`/api/v1/payments`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/init` | Authenticated | Initialize payment checkout for reservation |
| `POST` | `/api/v1/payments/webhook/stripe` | Public (Raw Body) | Stripe webhook event handler |
| `POST` | `/api/v1/payments/webhook/sslcommerz` | Public | SSLCommerz IPN callback handler |

### 🧠 Semantic RAG Engine Module (`/api/v1/rag`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/rag/ingest` | Admin / Super Admin | Ingest knowledge chunk with vector embedding |
| `POST` | `/api/v1/rag/ask` | Public | Ask AI Concierge a semantic hotel question |

### 🤖 Autonomous Agent Module (`/api/v1/agent`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/agent/runs` | Staff / Admin | Dispatch an autonomous operations agent run |
| `GET` | `/api/v1/agent/runs/:id` | Authenticated | Get agent run status and step logs |
| `POST` | `/api/v1/agent/runs/:id/steps/:stepId/approve` | Admin / Super Admin | Authorize or reject a pending HITL tool step |
| `GET` | `/api/v1/agent/runs/:id/stream` | Authenticated | Stream real-time agent execution logs via SSE |

---

## 🐳 Dockerization & Production Deployment

To build and run the entire platform stack using Docker Compose:

```bash
docker compose up --build -d
```

This starts:
1. `postgres` (PostgreSQL 16 with `pgvector` enabled)
2. `redis` (Redis 7 in-memory cache)
3. `api` (Compiled Express API server running Node 22 Alpine in production mode)

---

## 🧪 Testing with REST Client / Postman

An executable REST Client file is provided at [`api-test.http`](file:///e:/Project/nh-hotel/nh-hotel-backend/api-test.http). You can open it in VS Code (with the REST Client extension) or import it into Postman to execute all API workflows sequentially.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
