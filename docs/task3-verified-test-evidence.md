# Task 3 | Verified implementation evidence

**Project:** Melbourne Community Centre Booking System (MCCBS)  
**Verification date:** 24 November 2026  
**Repository branch:** `feature/task3-core-implementation`  
**Review:** https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/pull/12  
**Automated run:** https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/actions/runs/45344000378  
**Verified code revision:** `5c687285d120113fed3b575c7da88b44f0cbee55`

## GitHub Actions: all three jobs passed

| Automated job | Verified result |
|---|---|
| Backend unit tests | Passed 25 of 25 Node.js tests |
| Dependency security review | Production dependency audit passed at high severity threshold after Nodemailer update to 10.x |
| Frontend build | Vite production build passed |
| Full-stack PostgreSQL integration | PostgreSQL 18 service started, schema applied, sample data seeded and API tests passed |
| Booking and staff workflow | The smoke script checks room retrieval, login and roles, access control, request creation, personal history, approval, overlap rejection, cancellation, rebooking, rejection, and database dashboard counts |
| Free event promotion | The smoke script checks submission, personal listing, staff queue, staff approval and approved public listing |
| Account creation and verification | Six integration checks passed: registration, blocked unverified login, code generation, incorrect-code rejection, correct-code activation and verified login |

The full-stack checks use a temporary test database hosted inside GitHub Actions. They do not modify the student's local PostgreSQL database.

## Existing manual demonstration evidence

The team previously demonstrated a React frontend running through Vite, an Express API with PostgreSQL room records, and a booking visible as **Approved** on the staff dashboard. The instructor can repeat these actions using the project setup guide.

## Required evidence still to collect

1. A genuine 3–5 minute recording of the running app in the team's environment.
2. Week 5–6 meeting minutes with actual dates, attendance, decisions and evidence.
3. Real commit contributions and peer review from all five group members, with links to commits/PRs.
4. Final report and traceability matrix updated to reference the completed automated checks and to distinguish verified features from partial or planned features.

No meeting attendance, contribution share or peer review has been inferred from the CI run. The draft pull request should be reviewed by a team member before merging.

## Security and boundaries

- `.env`, database passwords, personal details and access tokens are excluded from the repository.
- The account-verification integration test uses synthetic accounts and captures local demonstration codes inside the test process. It adds no HTTP test bypass to the application.
- In local development, verification codes are shown in the backend terminal when SMTP is not configured. Production email delivery requires SMTP configuration.
- Free event promotions are moderated by staff before they become public.
