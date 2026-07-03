# Production Regression Storybook

This repo now has a production smoke path built around the actual public experience that exists today. There is no login or password-based account system in the codebase, so the reusable QA identity is a waitlist/lead/inquiry profile rather than a user account.

## QA identity

- Source of truth: local [`.env`](/Users/lsendel/Projects/findernyc.com/.env)
- Required variables:
  - `PRODUCTION_BASE_URL`
  - `QA_TEST_EMAIL`
  - `QA_TEST_FULL_NAME`
  - `QA_TEST_PHONE`
  - `QA_TEST_CITY`
  - `QA_TEST_ZIP`
  - `QA_TEST_SESSION_ID`
  - `QA_TEST_GOAL`

## Story

1. Landing page loads and exposes the primary discovery CTA.
2. Contact page loads and the waitlist intake copy is present.
3. Blog and commercial content routes render correctly.
4. `GET /api/config` confirms runtime feature flags are available.
5. `POST /api/waitlist` accepts the reusable QA identity.
6. `POST /api/leads` either creates the QA lead or returns `email_exists`, which is treated as a healthy idempotent rerun.
7. `POST /api/search` returns live ranked event results for a realistic discovery query.
8. `POST /api/saved-searches` stores a reusable saved search tied to the QA session.
9. `GET /api/saved-searches` confirms the saved search is visible.
10. `POST /api/inquiries/one-click` creates an inquiry from the top search result.
11. `POST /api/scheduling/calendar-sync` verifies the schedule step with a future test slot.
12. `GET /ops` without credentials must remain protected.

## Commands

API and flow regression:

```bash
npm run agent:production-regression
```

Visual regression on production:

```bash
UI_BASE_URL="$(grep '^PRODUCTION_BASE_URL=' .env | cut -d= -f2-)" npm run agent:ui-regression

# Lightweight desktop screenshot capture for current production
npx playwright screenshot --device="Desktop Chrome" "$PRODUCTION_BASE_URL" output/playwright/production/home.png
```

Core local code checks:

```bash
npm test
npm run test:a11y-gate
npm run typecheck
```

## Output

- API/flow report: [`output/agent-reports/production-regression.md`](/Users/lsendel/Projects/findernyc.com/output/agent-reports/production-regression.md)
- Visual report: [`output/agent-reports/ui-regression.md`](/Users/lsendel/Projects/findernyc.com/output/agent-reports/ui-regression.md)
- Manual production visual capture: [`output/agent-reports/production-visual-regression.md`](/Users/lsendel/Projects/findernyc.com/output/agent-reports/production-visual-regression.md)
- Screenshot artifacts: [`output/playwright/production/home.png`](/Users/lsendel/Projects/findernyc.com/output/playwright/production/home.png), [`output/playwright/production/contact.png`](/Users/lsendel/Projects/findernyc.com/output/playwright/production/contact.png), [`output/playwright/production/blog-guide.png`](/Users/lsendel/Projects/findernyc.com/output/playwright/production/blog-guide.png)
- Mobile screenshot artifacts: [`output/playwright/production/mobile/home-mobile.png`](/Users/lsendel/Projects/findernyc.com/output/playwright/production/mobile/home-mobile.png), [`output/playwright/production/mobile/contact-mobile.png`](/Users/lsendel/Projects/findernyc.com/output/playwright/production/mobile/contact-mobile.png), [`output/playwright/production/mobile/blog-guide-mobile.png`](/Users/lsendel/Projects/findernyc.com/output/playwright/production/mobile/blog-guide-mobile.png)

## Notes

- The QA identity is intentionally stable so reruns are possible without generating new credentials each time.
- The lead-capture step is treated as successful on either `201 Created` or `409 email_exists`.
- If production calendar sync is not backed by a provider endpoint, the current implementation still returns a successful `stub` schedule, which is enough for regression coverage.
