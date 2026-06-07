# Nursing School Management System

Full nursing school management platform for Uganda — students, academics, finance, clinical placements, and real-time notifications.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 10 Web API |
| Auth | ASP.NET Core Identity (2FA, roles, policies) |
| Real-time | SignalR (`/hubs/notifications`) |
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
| SignalR hub | ws://localhost:5080/hubs/notifications |

First startup runs migrations and bulk-seeds **2,000 students** with Ugandan names — allow 1–2 minutes.

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
  src/api/signalr.ts            # SignalR client
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

## Tests

```bash
dotnet test
```
