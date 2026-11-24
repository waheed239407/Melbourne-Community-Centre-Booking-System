# Melbourne Community Centre Booking System

**BISY3008 | Portfolio Task 3 | Case-based capstone project**

This website helps residents find rooms, request bookings, and share community events. Staff can manage booking decisions and moderate submitted event promotions.

This is a student demonstration project and is not an official Melbourne council service.

## Main pages

- **Home**: a welcoming introduction, main features, and links to room search and local events.
- **Find a Space**: rooms retrieved from PostgreSQL through the Express API, with date, time and capacity filtering.
- **Sign In and Create Account**: register with a name, email and password.
- **Email Verification**: newly registered accounts must enter a six-digit code before signing in.
- **My Bookings**: track requests and cancel eligible bookings.
- **Community Events**: public event noticeboard and free event-promotion submissions.
- **Staff**: review bookings and approve or reject community event submissions.

All event listings are free to submit. Staff review them before publication. No payment service is used.

## What is working in the source

The project contains implementation code for registration, verification, login, booking creation, availability checks, cancellation, staff decisions, room blocks and free event submissions. PostgreSQL transactions and role checks protect important actions. **Verification status (24 November 2026):** GitHub Actions passed 25 backend unit tests, the frontend production build, the high-severity production dependency audit, and a live PostgreSQL integration job. The integration job executes booking, staff-decision and promotion tests, plus a separate six-check account-registration and verification test. See `docs/task3-verified-test-evidence.md` and the linked GitHub Actions run. A 3–5 minute recording of the team's own application demonstration is still required for the course submission.

## Install on Windows in five steps

**1. Install Node.js and PostgreSQL.** Use Node.js LTS and a supported PostgreSQL release. Keep your PostgreSQL password private.

**2. Create the separate Task 3 database.** In SQL Shell (psql), run these two commands separately:

```sql
CREATE DATABASE mccbs_task3;
\c mccbs_task3
```

In pgAdmin's Query Tool, select `mccbs_task3` and execute the complete `database/schema.sql` file. This is a **fresh database setup script**, not a repeatable migration for an existing Task 3 database.

**3. Configure the backend.** Inside `backend`, copy `.env.example` to a new `.env` file. Replace `PGPASSWORD`, `JWT_SECRET` (32 or more random characters), and `DEMO_PASSWORD` (10 or more characters). Never commit `.env`.

**4. Start the backend.** Open Command Prompt in `backend`:

```bat
npm install
npm run seed
npm test
npm start
```

The seed creates three rooms and two accounts:

- Community login: `community.demo@mccbs.example`
- Staff login: `staff.demo@mccbs.example`

Both use the private `DEMO_PASSWORD` in your `.env` file. These demonstration accounts are marked as verified.

**5. Start the website.** Open another Command Prompt in `frontend`:

```bat
npm install
npm run dev
```

Open <http://localhost:5173>. Keep both Command Prompt windows open. If you change the backend code, restart `npm start`.

## Verify a newly created account

1. Click **Create Account** and enter your name, email and a password with at least 10 characters.
2. The website opens the **Verify your email** screen.
3. For a **local classroom demonstration without email settings**, read the six-digit code printed in the **backend terminal**. Enter it on the verification screen.
4. Sign in with the same email and password. Unverified accounts cannot sign in.

To deliver a code by real email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` and, if your email service requires them, `SMTP_USER` and `SMTP_PASS`. Use an approved email provider. The application does not provide free public email hosting or an SMTP service. **Never use the terminal-code fallback in production.**

## Promote a community event for free

1. Sign in and select **Community Events**.
2. Choose **Promote your event for free**.
3. Enter an event title, description, future date, category and location. Submit the form.
4. Sign out and enter the staff demo account, then open **Staff → Event promotion approvals**.
5. Approve the submission. It then appears on the public Community Events page.

The site does not charge a listing fee. This is an in-project public noticeboard, not a separate live advertising network or a deployed public promotional domain.

## Verification endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | PostgreSQL health |
| GET | `/api/rooms` | Room search |
| POST | `/api/auth/register` | Create unverified account |
| POST | `/api/auth/verify` | Verify email using six-digit code |
| POST | `/api/auth/resend-verification` | Request another verification code |
| POST | `/api/auth/login` | Log in after verification |
| POST | `/api/bookings` | Submit a Pending booking |
| GET | `/api/bookings/mine` | My bookings |
| GET | `/api/staff/bookings` | Staff booking queue |
| GET | `/api/promotions` | Public approved event listings |
| POST | `/api/promotions` | Submit free listing for review |
| GET | `/api/promotions/mine` | My listing statuses |
| GET | `/api/staff/promotions` | Staff promotion queue |
| PATCH | `/api/staff/promotions/:id` | Approve or reject promotion |

## Test and evidence

Run unit tests from `backend` with `npm test`. Twenty-five tests cover existing booking rules and email verification helpers. For the full database flow, start both servers and run `npm run smoke` from `backend`. The smoke test creates test bookings and a test promotion in the **local Task 3 database**. Save its real terminal results for the Task 3 evidence file.

Run `npm run build` from `frontend` to check a production React build. A local browser check should also confirm responsive layout at mobile widths.

## Scope and safety

- New users are community accounts only. Staff accounts must be created by trusted administrators or the private seed setup.
- Verification codes expire after 15 minutes and are limited to five attempts. Re-sends are time limited.
- Event submissions are private until staff approval. Public listing data contains no customer email or phone.
- Verification codes appear in the backend terminal **only for local development when SMTP is not configured**. For a public deployment, set `NODE_ENV=production` and configure email delivery. The server refuses unverified registration when email delivery is unavailable in production.
- Room-booking notification records are queued in the database. External booking email delivery is not yet implemented.
- This is an academic prototype. Production deployment would require further security review, monitoring, anti-abuse controls, accessibility checks and load tests.

## GitHub collaboration

Work on `feature/task3-core-implementation`. Keep code reviews and commit evidence genuine. Add the Week 5–6 meeting records and the 3–5 minute working walkthrough before the final Task 3 submission. Do not commit your `.env` file, passwords or `node_modules` folders.
