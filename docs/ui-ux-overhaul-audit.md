# UI and UX review | MCCBS

**Scope:** Existing React room-booking and community-events application, November 2026.  
**Source branch:** `feature/task3-core-implementation`  
**Improvement branch:** `ui/ux-overhaul`

The repository is a **community room-booking system**, not a paid ticketing platform. Only rules that match its current screens were applied.

## Findings and repairs

| Before | After | Why |
|---|---|---|
| Landing page used a large gradient, abstract room illustration, rotating overlays, promotional claims and ornamental numbered steps | Flat forest-green surface, concrete room-booking headline, real captured staff-dashboard screenshot and three feature annotations | Shows the actual product and removes decorative distraction |
| Navigation used many similarly weighted links and an account link that returned authenticated users to sign-in | Clear desktop navigation, five-option mobile bottom bar, separate signed-in account page | Improves findability and supports signed-in users |
| Four equal KPI cards gave staff metrics the same visual weight | Primary pending-requests metric with three quieter secondary metrics | Prioritises what staff must act on |
| Booking tables were fixed-width and overflowed mobile panels | A reusable booking table with sortable headings, 40/48/56px density options, frozen header/room column and container-query cards | Supports compact desktop use and narrow panels |
| Pending booking actions and destructive actions were visually adjacent | Approval uses an outlined control, rejection and cancellation use distinct text-danger controls and clear labels | Reduces mistakes and keeps destructive actions separate |
| Room cards used patterned gradients and decorative initials | Flat neutral room header and restrained hairline borders | Focuses attention on capacity, facilities and the request action |
| Loading initially left blank cards and tables or a text-only indicator | Layout-matched room, event and table skeletons with a composited shimmer | Keeps stable layout while data loads |
| Account verification required a separate Verify button and showed one plain input | Six visual digits backed by one native input with one-time-code autofill, automatic verification at six digits, error and checking feedback | Reduces steps while retaining accessible input semantics |
| Account screens had gradient panels, circles and ornamental slogans | Flat brand panel, direct copy, clear labels, normal login/register switch and useful hints | Minimises distraction during authentication |
| No responsive navigation safe-area handling and some inputs were too small on touch devices | Coarse-pointer 44px targets, 16px mobile inputs, bottom navigation with safe-area padding and scroll clearance | Improves touch usability and prevents iOS input zoom |
| Global feedback was a full-width alert above page content | Compact dismissible status notification at bottom, clear inline errors near forms | Preserves attention for the main task |
| Optimistic state updates were absent for quick booking decisions | Local row status updates immediately, then sync with API, with rollback if the request fails | Makes staff approval and owner cancellation feel responsive |

## Applied rules and changed files

| Area | Rules applied | Files |
|---|---|---|
| Landing and public copy | Flat brand surface, concrete headline, genuine product screenshot with three annotations, one primary CTA, no fabricated social proof | `frontend/src/App.jsx`, `frontend/src/styles.css`, `frontend/src/assets/staff-booking-dashboard.svg` |
| Responsive navigation | Desktop and mobile navigation, up to five mobile destinations, account profile, safe-area padding | `frontend/src/App.jsx`, `frontend/src/styles.css` |
| Booking lists | Sortable text headings, tabular numbers, column freezing, compact/default/comfortable row density, mobile cards through container queries, visible empty-state CTA | `frontend/src/components/BookingTable.jsx`, `frontend/src/styles.css` |
| Auth and OTP | Separate login/registration, auto-submit six-digit verification, autofill, inline checking/error, one interactive input | `frontend/src/components/VerificationCode.jsx`, `frontend/src/App.jsx`, `frontend/src/styles.css` |
| Forms and staff actions | Labels above inputs, clear action labels, progressive room-block panel, owner cancellation and staff decision updates with rollback | `frontend/src/App.jsx`, `frontend/src/styles.css` |
| Loading and motion | Skeletons with composited shimmer, 150ms button feedback, restrained transitions and reduced-motion alternative | `frontend/src/components/Skeleton.jsx`, `frontend/src/styles.css` |
| Colour and typography | Arial, neutral cool surfaces, green functional accent, hairline dividers, tabular metrics, fluid heading scale | `frontend/src/styles.css` |

## Intentionally not applied

- Ticket prices, ticket tiers, percentage discounts and purchase checkout: **not present** in MCCBS.
- Filename-extension truncation: the existing booking tables contain no filename column.
- Drag-to-reorder, swipe cards, pull-to-refresh, carousels and spring gestures: **not present**. Adding them would change product scope.
- Dark-mode switch and animated theme transitions: there is no theme toggle.
- Animated rolling KPI totals and staggered rows: the dashboard is used repeatedly, so static and immediately readable values are more appropriate.
- Pricing testimonial quotes and logo strips: no verified quote or pricing data was supplied.
- Backdrop dimming for modal overlays: the existing event form is an inline section, not a modal.
- Nonexistent ticket priority and SLA fields: not added.
- Automated animation on keyboard navigation: deliberately excluded for accessibility and speed.

## API and business-logic preservation

The frontend uses the same API paths for authentication, room search, bookings, staff decisions, room blocks and event promotions. No backend source, database schema or API route was changed in this UI branch. The components continue to consume the established response field names.

## Verification checklist

- [x] Source inspection confirmed the current pages, forms, tables, components and CSS.
- [x] JSX parser reported zero syntax diagnostics for updated React files.
- [x] No pricing, ticket workflow or unrelated new feature was introduced.
- [ ] GitHub Actions frontend production build must pass for the final branch head.
- [ ] Manual desktop QA: room search, request, approval, cancellation, promotion submission and moderation.
- [ ] Manual mobile QA: phone at 375px, tablet at 768px, landscape and 200% zoom.
- [ ] Keyboard QA: tab focus and form/verification flow.
- [ ] Real-device QA: iOS autofill and safe area, Android touch behaviour.

**Evidence standard:** passing a production build does not prove a visual layout or accessibility audit. Complete the manual checks on the running app before deployment or claiming full WCAG compliance.
