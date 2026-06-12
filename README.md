# Nursing School Management System

Full nursing school management platform for Uganda — students, academics, finance, clinical placements, and real-time notifications.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 10 Web API |
| Auth | ASP.NET Core Identity (2FA, roles, policies) |
| Real-time | SignalR (`/hubs/notifications`, `/hubs/classroom`) |
| Live classroom | Self-hosted Jitsi (white-labeled) + auto-graded quizzes |
| Frontend | React 18 + TypeScript + Vite |
| Database | PostgreSQL 16 |
| ORM | Entity Framework Core + Npgsql |

## Run everything in Docker (recommended)

```bash
docker compose up --build -d
```

| Service | URL |
|---------|-----|
| **Landing page** | http://localhost:3001 |
| **App (after login)** | http://localhost:3001/app |
| API / Swagger | http://localhost:5080/swagger |
| PostgreSQL | `localhost:5433` (user: `postgres`, password: `postgres`) |
| SignalR hubs | ws://localhost:5080/hubs/notifications · ws://localhost:5080/hubs/classroom |
| Video (internal) | https://localhost:8443 (proxied on production domain, see below) |

First startup runs migrations and bulk-seeds **2,000 students** with Ugandan names — allow 1–2 minutes.

### Live classroom video (production)

Video runs on the **same hostname** as the app (`nursing.pameoinvestimentsltd.com`) over port **443** with your existing Let's Encrypt certificate — no `:8443` in the browser and no Jitsi branding.

One-time server setup (after `ufw allow 10000/udp` and `ufw allow 8443/tcp`):

```bash
sudo ./scripts/setup-video-same-domain.sh
```

Alternative (separate subdomain — requires DNS `video.nursing…` → server IP):

```bash
sudo ./scripts/setup-video-server.sh
```

Then hard-refresh the app and open **Academic → Live Classroom**.

Reset database (fresh seed):

```bash
docker compose down -v
docker compose up --build -d
```

## Default accounts

| User | Password | Role |
|------|----------|------|
| `admin` | `Admin@123` | Admin |
| `finance` | `FinanceOfficer@123` | FinanceOfficer |
| `registrar` | `Registrar@123` | Registrar |
| `lecturer1` … `lecturer45` | `Lecturer@123` | Lecturer |
| `student1` … `student2000` | `Student@123` | Student |

## Features

### Identity & security
- ASP.NET Core Identity with JWT bearer tokens
- Two-factor authentication (TOTP authenticator app)
- Role management: Admin, Registrar, FinanceOfficer, Lecturer, ClinicalCoordinator, Student
- Authorization policies for users, finance, academic, clinical, and reports

### Bulk demo data (auto-seeded)
- **2,000 students** with Ugandan first/last names and districts
- **45 lecturers**, guardians/parents (portal-linked accounts)
- Course enrollments, weighted marks, attendance records
- Invoices with mixed status: paid, partial, overdue
- Payment methods: MTN Mobile Money, Airtel Money, Bank Transfer, Cash, Visa
- Clinical placements and evaluations
- **6 upcoming school events**

### Dashboards (role-based)
- **Admin** — enrollment, fees collected/outstanding, events, top balances
- **Finance** — collections, pending payments, method breakdown
- **Student** — marks, attendance, fee balance, upcoming events
- **Public landing** — stats, events, sign-in CTA

### Real-time (SignalR)
- Live notification toasts in the app
- Hub: `/hubs/notifications` (pass JWT via `?access_token=`)

### Live classroom
- **Video** — self-hosted Jitsi embedded in `/app/classroom/:sessionId` (left panel), white-labeled as *NSMS Live Classroom*
- **Quizzes** — lecturers author questions + correct answers (multiple choice, true/false, short answer); auto-graded on submit
- **Real-time** — `ClassroomHub` pushes quiz publish, submissions, and file uploads to all participants instantly
- **Files** — lecturers upload lecture PDFs/images; students download from the sidebar
- **Roles** — Lecturer/Admin host; enrolled Students join live sessions and submit quizzes

## Local development

### API

```bash
cd src/NursingSchool.Api
dotnet run --urls http://localhost:5080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server: http://localhost:5173 (proxies API and SignalR to port 5080)

## Solution structure

```
src/
  NursingSchool.Api/            # Controllers, Program, SignalR hub mapping
  NursingSchool.Application/    # DTOs, interfaces
  NursingSchool.Domain/         # Entities, enums, policies
  NursingSchool.Infrastructure/ # EF Core, Identity, bulk seeder, services
frontend/
  src/features/landing/         # Public landing page
  src/features/dashboard/       # Role-based dashboards
  src/api/signalr.ts            # Notification SignalR client
  src/api/classroomHub.ts       # Classroom SignalR client
  src/features/classroom/       # Session list + live room UI
scripts/
  setup-video-same-domain.sh    # Proxy video on nursing domain (no extra DNS)
  jitsi/                        # White-label config for self-hosted video stack
tests/
  NursingSchool.UnitTests/
```

## API highlights

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Login (`UserNameOrEmail`, `Password`) |
| `POST /api/auth/login-2fa` | Complete 2FA login |
| `GET /api/auth/2fa/setup` | Get authenticator QR setup |
| `GET /api/dashboard/public-stats` | Public stats (no auth) |
| `GET /api/dashboard/admin` | Admin dashboard |
| `GET /api/dashboard/finance` | Finance dashboard |
| `GET /api/events/upcoming` | Upcoming events |
| `GET /api/admin/users` | User management (Admin) |
| `GET /api/admin/roles` | Role management (Admin) |
| `GET /api/live-sessions` | List classroom sessions |
| `POST /api/live-sessions` | Create session (Lecturer/Admin) |
| `POST /api/live-sessions/{id}/start` | Go live — returns secure room ID |
| `POST /api/quizzes` | Create quiz with questions + correct answers |
| `POST /api/quizzes/{id}/publish` | Publish quiz to all students in room |
| `POST /api/quizzes/{id}/submit` | Student submit — auto-graded |
| `GET /api/quizzes/{id}/results` | Live results for lecturer |

SignalR classroom events: `QuizPublished`, `SubmissionReceived`, `FileUploaded`, `SessionStarted`, `SessionEnded`.

## Tests

```bash
dotnet test
```
