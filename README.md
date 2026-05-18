# HealthHelper — Referrals Management System

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![XState](https://img.shields.io/badge/XState-5-2C3E50?logo=xstate&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-5-FF6F00)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

HealthHelper is a referrals management platform that drives a clinical patient referral through a guarded, multi-step workflow — from intake to clinical preparation, insurance authorization, submission, scheduling, and final close-out. It is built for hospital and clinic staff (physicians, nurse practitioners, administrative staff, and specialist staff) who need an auditable, role-aware system that coordinates the dozens of small tasks each referral requires, surfaces real-time progress, and dispatches the right downstream notifications without blocking the clinician's workflow.

## Architecture Overview

HealthHelper is a containerized full-stack application split into a thin React SPA, a NestJS API that owns the workflow and persistence, and a set of stateful infrastructure pods (PostgreSQL, Redis, ClamAV). The backend models the referral lifecycle as an XState state machine: every transition is guarded by required-field checks, recorded in an append-only history table, and emitted to subscribed clients over WebSockets. Side-effects (notifications, follow-ups, simulated insurance round-trips) are pushed onto a BullMQ queue so the HTTP request returns immediately.

| Layer | Component | Tech |
|---|---|---|
| Frontend | React SPA with Material UI dashboards, dropzone document upload, and live socket updates | React 18, MUI 6, Recharts, socket.io-client, dayjs |
| Backend | NestJS REST API + Socket.IO gateway + BullMQ producer/consumer | NestJS 11, TypeORM, Passport JWT, class-validator |
| Workflow Engine | XState state machine with guards, substep tracking, and history | XState 5 |
| Database | Relational store for users, patients, referrals, notes, documents, history, audit | PostgreSQL 15 |
| Redis & Queue | Redis-backed BullMQ for delayed jobs and retries | Redis 7, BullMQ 5 |
| Realtime | WebSocket gateway broadcasting referral events to clients | Socket.IO |
| Orchestration | Pod scheduling, ingress (HTTP + WS), config/secret management | Kubernetes / Minikube |

## Features

- **7-step referral workflow with 5 substeps each** — Intake → Clinical Prep → Authorization → Ready to Submit → Submitted → Scheduling → Closed; each step has 5 ordered substeps (e.g. `1a`–`1e`) that capture mid-step progress.
- **XState workflow engine with guards** — typed guards (`canCompleteIntake`, `canCompleteClinicalPrep`, `canCompleteAuthorization`, `canCompleteScheduling`, `canCloseReferral`, plus `BACK_TO_STEP` guards) prevent forward transitions until required fields are present.
- **Role-based access control** — 4 roles (Physician, Nurse Practitioner, Admin Staff, Specialist Staff) enforced by a global `RolesGuard` on top of JWT authentication.
- **Real-time updates** — WebSocket gateway pushes status changes, authorization decisions, and queue activity to all open clients.
- **Async notifications via BullMQ** — 10 distinct job types covering status changes, patient/provider notifications, follow-ups, insurance polling, appointment reminders, and report-ready alerts.
- **Document upload with virus scan placeholder** — per-referral upload directory, MIME and size validation, ClamAV-shaped scanner stub.
- **Dashboard with analytics** — referral throughput, status distribution, priority breakdown, and time-in-stage charts rendered with Recharts.
- **Full audit trail** — every state transition is written to `referral_step_history` and every privileged action to `audit_logs`.

## Prerequisites

- Docker
- Minikube
- kubectl
- Node.js 18+
- npm

## Quick Start (Kubernetes)

```bash
minikube start --driver=docker
minikube addons enable ingress
echo "$(minikube ip) healthhelper.local" | sudo tee -a /etc/hosts
./k8s/deploy.sh
```

Then open <http://healthhelper.local>.

The `deploy.sh` script builds both Docker images, loads them into Minikube, applies every manifest in order, waits for readiness, and seeds the database.

## Quick Start (Local Development)

```bash
# 1. Start Postgres + Redis (and Redis Commander on :8082)
docker compose up -d

# 2. Backend
cd backend
npm install
npm run start:dev          # http://localhost:3000

# 3. Frontend (new terminal)
cd frontend
npm install
npm start                  # http://localhost:3001

# 4. Seed the database (new terminal, optional)
cd backend
npx ts-node -r tsconfig-paths/register src/database/seed.ts
```

Open <http://localhost:3001>.

## Test Accounts

All seeded users share the password `password123`.

| Role | Name | Email | Password |
|---|---|---|---|
| Physician | Dr. Sarah Johnson | sarah.johnson@hospital.com | password123 |
| Physician | Dr. James Wilson | james.wilson@hospital.com | password123 |
| Nurse Practitioner | Maria Rodriguez | maria.rodriguez@hospital.com | password123 |
| Admin Staff | Emily Davis | emily.davis@hospital.com | password123 |
| Admin Staff | Michael Brown | michael.brown@hospital.com | password123 |
| Specialist Staff | Dr. Lisa Chen | lisa.chen@hospital.com | password123 |

## API Endpoints

All endpoints are mounted under the global prefix and require a `Bearer` JWT except where noted (`Public`).

| Method | Path | Description | Auth | Roles |
|---|---|---|---|---|
| POST | `/auth/login` | Exchange credentials for a JWT | No | — |
| POST | `/users` | Create a user (temporary open sign-up) | No | — |
| GET | `/users` | List users | Yes | any |
| GET | `/users/:id` | Get a user by id | Yes | any |
| POST | `/patients` | Create a patient | Yes | Physician, Admin Staff, Nurse Practitioner |
| GET | `/patients?search=` | List/search patients | Yes | any |
| GET | `/patients/:id` | Get a patient by id | Yes | any |
| POST | `/referrals` | Create a referral | Yes | Physician, Nurse Practitioner |
| GET | `/referrals` | List referrals (filter by status/priority/specialty, paginate, sort, search) | Yes | any |
| GET | `/referrals/stats/dashboard` | Aggregate dashboard metrics | Yes | any |
| GET | `/referrals/:id` | Get a referral by id | Yes | any |
| PATCH | `/referrals/:id` | Update referral fields | Yes | Physician, Admin Staff, Nurse Practitioner |
| GET | `/referrals/:id/transitions` | List valid next transitions and missing fields | Yes | any |
| POST | `/referrals/:id/transition` | Fire a workflow event (`NEXT_SUBSTEP`, `PREVIOUS_SUBSTEP`, `COMPLETE_STEP`, `BACK_TO_STEP`) | Yes | Physician, Admin Staff, Nurse Practitioner |
| GET | `/referrals/:id/history` | Full step/substep history for a referral | Yes | any |
| POST | `/referrals/:id/notes` | Add a note to a referral | Yes | any |
| GET | `/referrals/:id/notes` | List notes for a referral | Yes | any |
| POST | `/referrals/:id/documents` | Upload a document (multipart, PDF/PNG/JPG/JPEG, ≤ 10 MB) | Yes | Physician, Nurse Practitioner, Admin Staff |
| GET | `/referrals/:id/documents` | List documents for a referral | Yes | any |
| DELETE | `/referrals/:id/documents/:docId` | Delete a document | Yes | Physician, Nurse Practitioner, Admin Staff |

## Project Structure

```
backend/src/
├── app.module.ts                  # Root module — DB, BullMQ, global guards
├── main.ts                        # Bootstrap
├── auth/                          # JWT auth, login, RolesGuard, decorators
├── users/                         # User entity, controller, service
├── patients/                      # Patient entity, controller, service
├── referrals/
│   ├── referral.entity.ts         # Referral aggregate root
│   ├── referrals.controller.ts
│   ├── referrals.service.ts
│   ├── workflow/
│   │   ├── referral.machine.ts    # XState machine (states, guards, actions)
│   │   └── workflow.service.ts    # Orchestrates transitions + side-effects
│   ├── notes/                     # Referral notes sub-resource
│   ├── documents/                 # Upload, virus-scan, storage
│   └── history/                   # Append-only step-history projection
├── notifications/                 # BullMQ producer + processor (10 jobs)
├── gateway/                       # Socket.IO gateway (real-time push)
├── audit/                         # Audit-log entity and service
├── common/                        # Shared utilities (virus scanner)
└── database/seed.ts               # Demo data seeder

frontend/src/
├── App.tsx                        # Router + theme + auth boot
├── index.tsx
├── api/axios.ts                   # Axios instance with bearer interceptor
├── context/AuthContext.tsx        # Login state, role, token
├── hooks/useSocket.ts             # Socket.IO subscription hook
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx          # Recharts analytics
│   ├── ReferralsListPage.tsx      # MUI DataGrid, filters, pagination
│   ├── NewReferralPage.tsx        # Create referral wizard
│   └── ReferralProfilePage.tsx    # Workflow controls, notes, documents
├── components/                    # Layout, chips, progress, toast, profile widgets
└── types/                         # Shared TS types + transition definitions
```

## Kubernetes Architecture

### Manifests (`k8s/`)

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `healthhelper` namespace |
| `configmap.yaml` | Non-secret env (DB host/port/user/name, Redis host/port) |
| `secret.yaml` | DB password and JWT signing secret |
| `postgres.yaml` | PostgreSQL StatefulSet + Service + PVC |
| `redis.yaml` | Redis Deployment + Service for BullMQ and cache |
| `clamav.yaml` | ClamAV Deployment + Service for document virus scanning |
| `backend.yaml` | NestJS API Deployment (2 replicas) + Service with readiness/liveness probes |
| `frontend.yaml` | React SPA Deployment + Service (nginx-served static build) |
| `ingress.yaml` | Public HTTP ingress to frontend and `/api` to backend |
| `ingress-ws.yaml` | Sticky-session ingress for the Socket.IO upgrade path |
| `deploy.sh` | Build → load → apply → wait-ready → seed pipeline |

### Pods

| Pod | Purpose |
|---|---|
| `backend-*` (×2) | NestJS API, WebSocket gateway, BullMQ producer & consumer |
| `frontend-*` | nginx serving the React production bundle |
| `postgres-0` | Primary relational store (StatefulSet, PVC-backed) |
| `redis-*` | Cache + BullMQ broker |
| `clamav-*` | Virus-scan service for uploaded documents |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL hostname | `localhost` (local) / `postgres` (k8s) |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `referrals_user` |
| `DB_PASS` | PostgreSQL password | `referrals_pass` |
| `DB_NAME` | PostgreSQL database name | `referrals_db` |
| `REDIS_HOST` | Redis hostname | `localhost` (local) / `redis` (k8s) |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | HMAC secret for signing JWTs | `referrals-secret-key-change-in-production` |
| `PORT` | Backend HTTP port | `3000` |

## Workflow States

The referral progresses through 7 ordered states; each state has 5 ordered substeps (a–e). Forward `COMPLETE_STEP` transitions are gated by guards that check required fields. `BACK_TO_STEP` is allowed from any later state to any earlier state.

| # | State | Substeps | Guard / Required fields |
|---|---|---|---|
| 1 | `intake` | `1a`, `1b`, `1c`, `1d`, `1e` | `canCompleteIntake`: `patientId`, `referralType`, `specialty`, `priority`, `diagnosisCode` |
| 2 | `clinical_prep` | `2a`, `2b`, `2c`, `2d`, `2e` | `canCompleteClinicalPrep`: intake fields + `clinicalReason` |
| 3 | `authorization` | `3a`, `3b`, `3c`, `3d`, `3e` | `canCompleteAuthorization`: `authorizationStatus` ∈ `APPROVED` / `APPROVED_WITH_MODIFICATIONS` / `NOT_REQUIRED` |
| 4 | `ready_to_submit` | `4a`, `4b`, `4c`, `4d`, `4e` | `canCompleteReadyToSubmit`: prior fields remain satisfied |
| 5 | `submitted` | `5a`, `5b`, `5c`, `5d`, `5e` | `canCompleteSubmitted`: always allowed |
| 6 | `scheduling` | `6a`, `6b`, `6c`, `6d`, `6e` | `canCompleteScheduling`: `appointmentDate` |
| 7 | `closed` | `7a`, `7b`, `7c`, `7d`, `7e` (final) | `canCloseReferral` (on the last substep): `specialistReport` |

Workflow events: `NEXT_SUBSTEP`, `PREVIOUS_SUBSTEP`, `COMPLETE_STEP`, `BACK_TO_STEP`.

## BullMQ Jobs

Queue name: `referral-notifications`. All jobs have `attempts: 3` and exponential backoff.

| Job Name | Trigger | Type | Description |
|---|---|---|---|
| `status-change-notification` | Any workflow status change | Instant | Audit + broadcast the from/to status to subscribers |
| `notify-patient-submitted` | Referral enters `submitted` | Instant | Notify the patient that the referral has been sent |
| `notify-provider-submitted` | Referral enters `submitted` | Instant | Confirm submission to the referring provider |
| `follow-up-no-scheduling` | Referral enters `submitted` | Delayed (3 days) | Nudge if no appointment is scheduled yet |
| `follow-up-urgent` | Referral enters `submitted` | Delayed (7 days) | Escalation follow-up for stalled referrals |
| `track-authorization-status` | Referral enters `authorization` | Delayed (30s, sim) | Simulate insurance decision round-trip and write the result |
| `notify-patient-appointment` | `appointmentDate` first set | Instant | Send the patient their appointment details |
| `appointment-reminder` | `appointmentDate` first set | Delayed (~24h before) | Day-before reminder to the patient |
| `notify-provider-report-ready` | Referral closes | Instant | Tell the referring provider the specialist report is in |
| (retry path) | Any of the above failing | Backoff | Exponential retry with `removeOnComplete/Fail: 100` |

## Assumptions & Trade-offs

- **`synchronize: true` in TypeORM** — schema is auto-derived from entities for MVP speed. Production should switch to versioned migrations.
- **Console-logged notifications** — the BullMQ processor prints email/SMS payloads instead of integrating with a real provider.
- **Virus-scan placeholder** — uploaded files run through a stub scanner. A real ClamAV daemon is deployed in the cluster but not yet wired to the upload pipeline.
- **JWT without refresh tokens** — access tokens are long-lived and there is no rotation or blacklist.
- **Single PostgreSQL replica** — no read replicas, no HA fail-over; volume is a single PVC.
- **Open `POST /users`** — convenient for demos but unsafe; should sit behind an admin guard or invite flow.
- **Insurance authorization is simulated** — `track-authorization-status` flips the status at random after a fixed delay rather than calling a real payer API.

## Future Improvements

- Real email/SMS integration (SendGrid, Twilio).
- Wire document upload through the ClamAV daemon for actual virus scanning.
- Move document storage from the pod's local disk to S3 (or a compatible object store).
- Refresh tokens, token rotation, and a revocation list.
- Horizontal Pod Autoscaler on backend and frontend tied to CPU/queue depth.
- CI/CD pipeline (build → test → image push → `kubectl apply`).
- Field-level RBAC for sensitive referral attributes.
- Optimistic locking (entity version column) to prevent lost updates on concurrent edits.
- Replace `synchronize: true` with TypeORM migrations.
- Replace open `POST /users` with an admin-gated invite flow.
