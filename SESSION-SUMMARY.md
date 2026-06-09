# NSMS Session Summary

Summary of changes made across the Nursing School Management System during this development session.

---

## 1. Results & Reports — Photos & Zoom

### Student results transcript (`/app/results/view`)
- Each transcript now shows the **student's uploaded profile photo** in the report header.
- **Printed transcripts** also include the profile photo.
- Click the photo to open a **zoom viewer**.

### New component: `ZoomableImage`
Reusable zoom/lightbox used wherever uploaded images appear:
- Click thumbnail (magnifier icon) to open full preview
- **+ / −** buttons or **scroll** to zoom (up to 400%)
- **Drag** to pan when zoomed in
- **Reset**, **Close**, or **Escape** to exit

**Used in:**
| Location | What's zoomable |
|----------|-----------------|
| Results / reports transcript | Profile photo |
| Student Registry table | Profile thumbnails |
| Student Registry table | National ID Front/Back badges (when uploaded) |
| Photo upload fields | Preview while uploading |
| Profile view modal | Profile photo & national ID images |

**Files added/changed:**
- `frontend/src/components/ui/ZoomableImage.tsx` (new)
- `frontend/src/components/ui/NationalIdDocCell.tsx` (new)
- `frontend/src/components/results/StudentResultsTranscript.tsx`
- `frontend/src/components/ui/ProfileViewModal.tsx`
- `frontend/src/components/ui/PhotoUploadField.tsx`
- `frontend/src/components/ui/StudentPhotoCell.tsx`
- `frontend/src/components/ui/ProfileAvatar.tsx`
- `frontend/src/features/students/StudentsPage.tsx`
- `frontend/src/utils/printStudentTranscript.ts`
- `frontend/src/index.css`

---

## 2. Identity & Administration Restructure

Identity was split so **login accounts** are separate from **document uploads**.

### User Accounts (`/app/admin/users`)
- **Removed** profile photo and national ID uploads
- **Removed** photo and national ID columns from the table
- Focus: username, email, password, roles, 2FA, account status
- Quick links to where documents are managed: Students, Teachers, Administrators

### Administrators (`/app/admin/administrators`) — new
- Manages leadership staff accounts
- Keeps photo and national ID uploads (with zoom)
- Roles: System Administrator, Principal / Registrar, Bursar, Clinical Coordinator

### Teachers (`/app/teachers`) — unchanged location
- Under **Enrollment → Teachers**
- Lecturer accounts with photos and national ID uploads

### Updated role display names
| Role | Display name |
|------|----------------|
| Admin | System Administrator |
| Registrar | Principal / Registrar |
| FinanceOfficer | Bursar |

### Side navigation (Administration)
Flat links under **Administration** (no nested collapse):
- **User Accounts**
- **Administrators**
- **Activity Logs**

**Files added/changed:**
- `frontend/src/features/admin/userManagementConfig.ts` (new)
- `frontend/src/features/admin/AdminUsersPage.tsx`
- `frontend/src/utils/roles.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/ui/ProfileViewModal.tsx` (`showMedia` prop)

---

## 3. Activity Logs — Login Tracking

### Side nav
- **Activity Logs** → `/app/admin/activity-logs` (System Administrator only)

### What gets logged
Each successful login (including 2FA) records:
- **When** — date and time
- **Who** — name, username, email, roles
- **IP address** — from `X-Forwarded-For` / `X-Real-IP` when behind a proxy
- **User agent** — browser/client info

### Backend
- New `LoginActivity` entity and `LoginActivities` database table
- `ILoginActivityService` records logins and serves paginated history
- API: `GET /api/auth/activity-logs` (Admin only)
- Migration: `20260609160000_LoginActivity`

### Fix applied
- Initial deploy failed with **"Request failed"** because the migration was not registered with EF Core
- Table created manually; migration file updated with `[Migration]` attribute for future deploys

**Files added/changed:**
- `src/NursingSchool.Domain/Entities/LoginActivity.cs` (new)
- `src/NursingSchool.Application/DTOs/LoginActivityDtos.cs` (new)
- `src/NursingSchool.Application/Interfaces/ILoginActivityService.cs` (new)
- `src/NursingSchool.Infrastructure/Services/LoginActivityService.cs` (new)
- `src/NursingSchool.Api/Http/ClientIpHelper.cs` (new)
- `src/NursingSchool.Infrastructure/Migrations/20260609160000_LoginActivity.cs` (new)
- `src/NursingSchool.Api/Controllers/AuthController.cs`
- `src/NursingSchool.Infrastructure/Services/IdentityAuthService.cs`
- `frontend/src/features/admin/ActivityLogsPage.tsx` (new)
- `frontend/src/api/endpoints.ts`
- `frontend/src/types/index.ts`
- `frontend/src/utils/roles.ts`
- `frontend/src/App.tsx`

---

## 4. Dashboard — Fee Collections Line Chart

The **Fee collections** chart on the dashboard was redesigned.

### Visual
- Teal **gradient fill** under the actual collection line
- Thicker line with dots on each month
- **Dashed amber trendline** (linear regression)
- Taller chart (260px) with subtle card background

### Data & UX
- Month labels: **Jan, Feb, Mar…** instead of raw `MM`
- Header: total collected + month count
- **Trend badge** (↑/↓ %) comparing latest month to first
- Custom tooltip: actual amount, trend value, above/below trend delta
- Legend: **Actual collections** (teal) vs **Trendline** (dashed amber)
- **On-chart explainer** so staff know how to read the trendline

### How to read the trendline (shown on dashboard)
| Element | Meaning |
|---------|---------|
| **Solid teal line** | Real fees collected each month |
| **Dashed amber trendline** | Overall direction across the period — smooths month-to-month ups and downs so you can see if collections are generally rising or falling (linear regression) |
| **Hover tooltip** | Compares that month’s actual collection vs the trend value; shows above/below trend |
| **Badge** | How the latest month compares to the first month on the chart |

> **How to read this chart:** The solid teal line shows real fees collected each month. The dashed amber trendline is the overall direction across the period — it smooths out month-to-month ups and downs so you can see whether collections are generally rising or falling. Hover a month to compare actual vs trend. The badge shows how the latest month compares to the first month shown.

**Files added/changed:**
- `frontend/src/components/charts/CollectionsTrendChart.tsx` (new)
- `frontend/src/components/charts/DashboardCharts.tsx`
- `frontend/src/index.css`

---

## Deploy Checklist

```bash
# From project root
docker compose up --build -d
```

### After deploy
1. Hard-refresh the browser (**Ctrl+Shift+R**)
2. Log in as **System Administrator** to see Administration links and Activity Logs
3. Sign in once to generate the first activity log entry
4. Open **Dashboard** to see the updated collections chart

### Production database (if Activity Logs still fails)
Run once on the production PostgreSQL database if the `LoginActivities` table is missing:

```sql
CREATE TABLE IF NOT EXISTS "LoginActivities" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "UserName" text NOT NULL,
    "Email" text NOT NULL,
    "FullName" text,
    "Roles" text NOT NULL,
    "IpAddress" text,
    "UserAgent" text,
    "LoggedInAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_LoginActivities" PRIMARY KEY ("Id")
);
CREATE INDEX IF NOT EXISTS "IX_LoginActivities_LoggedInAt" ON "LoginActivities" ("LoggedInAt");
CREATE INDEX IF NOT EXISTS "IX_LoginActivities_UserId" ON "LoginActivities" ("UserId");
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260609160000_LoginActivity', '10.0.8')
ON CONFLICT DO NOTHING;
```

---

## Quick Reference — New Routes

| Route | Purpose | Who can access |
|-------|---------|----------------|
| `/app/results/view` | Student transcript with photo & zoom | Admin, Lecturer, Registrar, Student |
| `/app/admin/users` | User accounts (no document uploads) | System Administrator |
| `/app/admin/administrators` | Leadership staff + documents | System Administrator |
| `/app/teachers` | Lecturer accounts + documents | Admin, Registrar |
| `/app/admin/activity-logs` | Login history (IP, when, who) | System Administrator |
| `/app/dashboard` | Dashboard with improved collections chart | All staff roles |

---

## Notes

- **Student** and **parent/guardian** photos/documents remain on **Students** (and admissions flow); parents are linked via student/guardian records.
- **Zoom** works on click — look for the magnifier icon on thumbnails.
- **Activity logs** only capture successful logins going forward; historical logins before this release are not backfilled.
