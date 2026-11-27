# Portfolio Task 3: Implementation evidence and sprint status

Checkpoint evidence dated 25 November 2026. Evidence register updated 27 November 2026.

## Architecture and requirements mapping

| Task 2 component | Task 3 implementation | Task 1 requirements | Evidence |
|---|---|---|---|
| Presentation layer | React/Vite public, community and staff interfaces | FR-01 to FR-09 | Screenshot appendix E01–E14 |
| Application layer | Express authentication, room search and booking APIs | FR-01 to FR-09 | README endpoint register, application CI |
| Persistence layer | PostgreSQL schema, availability rules and booking transactions | FR-02 to FR-09 | E03, E14, application CI |
| Reporting | Staff summary counts and activity records | FR-12 (partial) | Implementation report |
| Notifications | Local account verification and queued booking notifications | FR-01, FR-11 (partial) | E07–E08, verification checks |

The architecture baseline is recorded in [Task 2 architecture commit](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/commit/6b15a585bcd3d482e365811d10bddbc64784a037). External SMTP delivery has not been established by the local demonstration.

## Verification register

| Test scenario | Expected result | Reported evidence |
|---|---|---|
| Room search | Available rooms returned for selected date, time and capacity | E02, application CI |
| Booking creation | Pending request persisted | E04, application CI |
| Staff decision | Authorised approval updates booking status | E05–E06 |
| Overlapping booking | Conflicting approval prevented | Application CI smoke checks, E14 availability |
| Cancellation | Eligible booking changes to Cancelled | E12–E13 |
| Unverified login | Access denied before account activation | Verification integration checks |
| Incorrect verification code | Code rejected | Verification integration checks |
| Valid verification code | Account activated and login succeeds | E07–E08, verification integration checks |
| Event moderation | Pending event becomes publicly visible only after approval | E09–E11 |
| Responsive interface | Desktop and mobile browser checks pass | Chromium CI |

Reported automated results: 25 unit tests, 18 database/API checks, 6 verification checks and 5 Chromium tests passed. The [application run](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/actions/runs/45587530913) and [browser run](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/actions/runs/45587530970) are the original evidence references. These are group results, not individual authorship evidence.

## Sprint issue register

This register reflects the current documented checkpoint, not a historical reconstruction of board movements. The original issues remain open pending their full acceptance criteria.

| Work item | Implementation status | Outstanding acceptance criterion |
|---|---|---|
| [#7 Core implementation](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/issues/7) | Core prototype implemented | Independent review and individual commit links |
| [#8 Database verification](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/issues/8) | Reported tests and screenshots available | Confirm acceptance checklist against logs |
| [#9 Walkthrough](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/issues/9) | MP4 supplied separately for assessment | Confirm duration and content before submission |
| [#10 Team contributions](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/issues/10) | Meeting reconstruction and proposed allocations available | Team confirmation and individual evidence |
| [#11 UI and account features](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/issues/11) | Responsive UI, local verification and event moderation evidenced | Independent review and remaining scope checks |

The Task 2 board baseline is recorded in [commit 078c6ec](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/commit/078c6ecd1090304891267f1488a36fc462de3741). A current project board view should be attached separately to demonstrate sprint execution.

## Final sprint priorities

Complete facility filtering, remaining staff room administration, live email integration and report exports. Verify WCAG 2.2 AA, response-time targets and 100-user load behaviour before claiming those requirements are satisfied.

## Submission evidence

The implementation report, traceability workbook, screenshot appendix, meeting and contribution record and demonstration MP4 are separate assessment files. PR [#13](https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/pull/13) is open and no independent review was returned on 27 November 2026. Individual contributions must be supported by authentic commit or review records and confirmed by the members. No production readiness claim is made.
