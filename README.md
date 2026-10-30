# Melbourne Community Centre Booking System

BISY3008 SD Information Systems Project (Capstone)

This repository contains the technical baseline for Portfolio Task 2: System Architecture, Data Modelling & Toolchain.

## Project summary
The Melbourne Community Centre Booking System is a case-based web application for managing community centre room availability and bookings. The system supports room search, availability checking, booking requests, staff approval or rejection, cancellation, email notifications, room management and basic reporting.

## Technology stack
- Frontend: React
- Backend/API: Node.js with Express
- Database: PostgreSQL
- Version control: Git and GitHub
- CI: GitHub Actions

## Repository structure
- `db/schema.sql` - PostgreSQL relational schema, constraints and indexes
- `db/seed.sql` - initial sample data
- `docs/` - editable Draw.io technical diagrams
- `.github/workflows/ci.yml` - initial CI validation workflow

## Core database rule
The database design prevents overlapping approved bookings for the same room and time period.

## Team
- Asiful Islam Seiam - 238473
- Md Maruf Joeader Tamim - 235214
- Abdul Rahman Bin Khalid Gindwan - 235875
- Waheed Mohammad Khan - 239407
- S M Ashraf Uz Zaman Arnob - 238928

Each member has an equal 20% contribution allocation for Portfolio Task 2.