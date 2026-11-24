# Website feature summary | Portfolio Task 3

| Requested improvement | Implementation | How to demonstrate |
|---|---|---|
| Remove Source label | Technical data-source notes are removed from public room cards and page footer. Database integration remains. | Open Find a Space. |
| Login page | Separate, branded Sign In screen connected to the existing authenticated API. | Sign in with seeded demo account. |
| More attractive website | New responsive home page, cohesive AIH-inspired green palette, improved navigation, cards, spacing and form styling. | Show desktop and mobile layouts. |
| Create account | Account registration connected to PostgreSQL with password hashing and a community role. | Create a new account with a test email. |
| Verify account | Six-digit, time-limited challenge, hashed code, attempt limit, and optional SMTP email delivery. | Enter the development code shown in the local backend terminal. |
| Free promotion website | Public community events noticeboard, free event submissions and staff moderation. | Submit a future event, approve it as staff, then refresh the noticeboard. |

**Scope note:** The event noticeboard is an additional feature, not part of the original Task 1 core booking requirements. It should be described as a separately identified extension in the implementation report and traceability matrix.

**Evidence note:** Source implementation and passing unit tests are available. Live browser/API integration and the full workflow still require verification on the team's machine. Do not describe them as verified until the end-to-end smoke test has been run and recorded.
