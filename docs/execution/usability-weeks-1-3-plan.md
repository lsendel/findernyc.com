# Usability, SEO, And LLM Discovery Execution Plan (Weeks 1-3)

## Objective
Ship a professional, trustworthy, and conversion-efficient product experience across all screens so marketers and operators can improve ranking in Google and LLM search while reducing day-to-day workflow friction.

## Success Metrics (Track Weekly)
- Organic discovery quality: `impressions`, `CTR`, and `inquiry_rate` by query cluster.
- LLM discovery quality: citations/referrals from LLM-origin traffic and answer-block engagement.
- Funnel efficiency: median time from `search -> inquiry -> schedule`.
- Form completion quality: submit conversion and draft-recovery conversion on landing/contact.
- Trust quality: reduction in unsupported claims, metadata errors, and stale-page incidents.

## Week 1 (Foundation Hardening)

### Goals
- Eliminate SEO freshness integrity gaps.
- Remove trust-risk signals and placeholders from public marketing surfaces.
- Secure operational controls by default.

### Scope
- Content + SEO integrity
  - Add explicit per-page freshness metadata (`publishedAt`, `updatedAt`) and render real updated dates.
  - Generate sitemap `lastmod` from page metadata instead of runtime "today" values.
- Professional trust baseline
  - Remove unverifiable social proof claims and generic placeholder social links from JSON-LD.
  - Replace with neutral, defensible trust copy.
- Ops safety
  - Require `OPS_ACCESS_TOKEN` to access `/ops`; fail closed when missing.
- Documentation and operations
  - Record security/SEO expectations in this execution plan and keep implementation status current.

### Delivery Artifacts
- `src/templates/content-page.ts`
- `src/index.ts`
- `src/templates/landing.ts`
- `tests/unit/seo-routes.test.ts`
- `tests/unit/usability-flow-templates.test.ts`

## Week 2 (Usability + Flow Automation)

### Goals
- Make marketer workflows clearer and faster across home, content pages, and contact.
- Automate default actions safely while keeping user control explicit.

### Scope
- Funnel unification
  - Align landing/contact lead routing into one canonical intake decision service.
  - Normalize analytics events so both surfaces report comparable conversion steps.
- Progressive disclosure and defaults
  - Keep beginner paths simple; move advanced controls behind clearer opt-in gates.
  - Preserve high-value defaults (saved alerts, profile autofill, inquiry progression) with transparent status messaging.
- Screen-level usability upgrades
  - Home: split IA by persona (consumer, marketer, operator) with explicit pathways.
  - Contact: improve intent mapping and next-step confidence cues.
  - Content pages: strengthen action continuity and workflow shortcuts.

### Delivery Artifacts
- `src/assets/js/main.ts` (modularized flow controllers)
- `src/assets/js/lead-capture-form.ts`, `src/assets/js/onboarding-assistant.ts`, `src/assets/js/journey-progress.ts`, `src/assets/js/section-observer.ts`, `src/assets/js/faq-accordion.ts`, `src/assets/js/pricing-tabs.ts`, `src/assets/js/carousel.ts`, `src/assets/js/mobile-nav.ts`, `src/assets/js/contact.ts`, `src/assets/js/content-workflow.ts`
- `src/routes/api/leads.ts` and `src/routes/api/waitlist.ts` (shared routing policy)
- `src/templates/landing.ts`, `src/templates/contact.ts`, `src/templates/content-page.ts`
- New tests for routing parity and flow telemetry contracts, including onboarding quick-pack, journey progression, section view, FAQ accordion, pricing tabs, carousel, mobile-nav, and cross-flow integration behavior coverage.

## Week 3 (Insights, Ranking, And Professional UX)

### Goals
- Give marketers actionable ranking insights (not vanity metrics).
- Improve perceived product professionalism and reduce "vibe-coded" feel.

### Scope
- Insights and ranking loop
  - Build query-cluster insight summaries from search and conversion events.
  - Surface "what to fix next" recommendations for low-coverage/high-intent clusters.
  - Generate a weekly execution playbook from funnel bottlenecks and intake routing policy to turn insights into direct actions.
  - Include route explainability and confidence guardrails so automation defaults pause when recommendation confidence is low.
  - Close the loop by tracking playbook step completion and surfacing adoption metrics in the same snapshot view.
  - Add post-completion outcome deltas so marketers can see whether completed playbook actions improve funnel conversion.
  - Add outcome-recovery recommendations and one-click remediation queries when deltas regress.
  - Auto-run high-priority recovery queries by default when confidence allows and search input is empty.
  - Measure recovery-query impact and trigger escalation recommendations when recovery deltas remain flat or negative.
  - Add fail-safe escalation automation and per-action attribution so auto behavior remains auditable.
- SEO + LLM expansion
  - Upgrade `llms.txt` with clearer retrieval guidance and canonical topical routes.
  - Expand structured content governance (revision history and source confidence conventions).
- UI quality and consistency
  - Harden typography hierarchy, spacing rhythm, and component consistency across pages.
  - Standardize status, empty, and error states.

### Delivery Artifacts
- `src/routes/api/analytics.ts` and insight aggregation modules (`src/insights/hub.ts`)
- `src/templates/content-page.ts`, `src/templates/landing.ts`, and `src/templates/contact.ts`
- `src/assets/js/main.ts`, `src/assets/js/contact.ts`, and `src/assets/css/styles.css`
- Reporting docs in `output/agent-reports/` for weekly KPI snapshots.

## Current Status
- [x] Plan created and aligned to audit findings.
- [x] Week 1 implementation started (2026-03-04).
  - Shipped metadata-driven freshness rendering and sitemap `lastmod` handling.
  - Shipped fail-closed `/ops` route protection when `OPS_ACCESS_TOKEN` is absent.
  - Removed placeholder trust-risk schema and social-proof claims from landing.
  - Unified intake routing policy across `/api/leads` and `/api/waitlist`.
  - Aligned client-side routing previews with backend enterprise/partnership logic.
- [x] Week 1 implementation complete (2026-03-04).
  - Added shared intake submission persistence helper and canonical mirrored writes from lead capture into waitlist intake records.
  - Added channel-specific follow-up status auditing (`pending_lead_capture`, `pending_contact_waitlist`).
- [x] Week 1 hardening extension complete (2026-03-05).
  - Added runtime analytics provider config fields to `/api/config` (`ga4_measurement_id`, `segment_write_key`, provider booleans).
  - Removed tracking-id placeholder TODO in `main.ts` and wired provider forwarding for client telemetry (`window.gtag`, `window.analytics.track`) behind runtime config.
  - Added focused unit coverage for analytics runtime parsing/forwarding and env-normalized `/api/config` analytics payloads.
- [x] Week 2 implementation started (2026-03-04).
  - Added routing transparency, adaptive submit labels, and contact draft recovery.
  - Added onboarding quick-pack defaults and waitlist funnel instrumentation across landing/contact.
  - Added follow-up automation parity to `/api/leads` so lead capture and contact waitlist now trigger canonical follow-up workflows.
  - Started `main.ts` modularization by extracting shared client intake routing logic into a dedicated module.
  - Moved contact and content workflow personalization into dedicated client bundles (`/js/contact.js`, `/js/content-workflow.js`) to reduce inline script sprawl.
  - Extracted landing lead capture controller into `lead-capture-form.ts` and retained feature parity via explicit dependency wiring.
  - Extracted onboarding assistant controller into `onboarding-assistant.ts` and retained quick-pack/auto-alert behavior via explicit dependency wiring.
  - Extracted journey progress controller into `journey-progress.ts` and retained cross-screen continuity logic via explicit dependency wiring.
  - Extracted section observer and FAQ accordion controllers into dedicated modules (`section-observer.ts`, `faq-accordion.ts`) and retained event instrumentation/state handling.
  - Extracted pricing tabs and mobile testimonials carousel controllers into dedicated modules (`pricing-tabs.ts`, `carousel.ts`) and retained telemetry + state behavior.
  - Extracted mobile navigation controller into a dedicated module (`mobile-nav.ts`) and retained drawer/focus-trap behavior.
  - Extracted Smart Search display helpers (labels, filter summary, compare panel) into `smart-search-display.ts` to reduce remaining `main.ts` coupling.
  - Extracted fraud operations render helpers into `fraud-ops.ts` and retained dashboard/queue decision behavior through explicit render wiring.
  - Extracted saved-search API/render helpers into `saved-searches.ts` and preserved onboarding + smart-search alert progression via explicit `onCreated` journey-step wiring.
  - Extracted inquiry-profile persistence/load helpers into `inquiry-profile.ts` and preserved profile merge/autofill behavior via shared sanitization helpers.
  - Extracted AI + experience request wrappers into `ai-experience-client.ts` and preserved endpoint payload/response contracts via shared request helpers.
  - Extracted operations/dashboard/partner/webhook request wrappers into `ops-api-client.ts` and preserved endpoint payload contracts + nonce/signature generation flow.
  - Extracted one-click inquiry + calendar scheduling request wrappers into `inquiry-scheduling-client.ts` and preserved auto-autofill + conflict response handling contracts.
  - Extracted marketing snapshot persistence helpers into `marketing-snapshot-state.ts` and preserved playbook-progress + automation-preference localStorage contracts.
  - Extracted landing marketing snapshot orchestration into `marketing-snapshot-controller.ts` and preserved auto-run query/recovery/escalation + intake telemetry behavior via injected render/client dependencies.
  - Added focused onboarding quick-pack unit tests for role recommendation, auto-alert dedupe, and preference-toggle persistence.
  - Added focused journey-progress unit tests for next-step CTA progression and event-driven rerender continuity.
  - Added focused unit tests for section-view dedupe and FAQ accordion expansion/close behavior.
  - Added focused unit tests for pricing-tab switching telemetry and mobile carousel dot/swipe behavior.
  - Added focused unit tests for Smart Search display helper rendering and lead-capture success-path route-based next action derivation (`follow_up.route`).
  - Added focused unit tests for saved-search helper requests/rendering/actions and endpoint method contracts.
  - Added focused unit tests for inquiry-profile draft compaction, localStorage persistence, and remote profile fallback behavior.
  - Added focused unit tests for AI + experience client endpoint methods, URL encoding, and payload serialization contracts.
  - Added focused unit tests for ops API client request methods, encoded routes, payload serialization, and webhook signature headers.
  - Added focused unit tests for inquiry scheduling client request payload serialization, one-click `204` handling, and calendar conflict pass-through behavior.
  - Added focused unit tests for marketing snapshot state helpers covering deterministic playbook keys, preference defaults/persistence, and playbook-step sanitization.
  - Added focused unit tests for marketing snapshot controller auto-run query behavior and playbook intake telemetry wiring.
  - Fixed lead-capture success rerender behavior to keep the route-specific next-action CTA visible after submit confirmation.
  - Added focused unit tests for mobile-nav drawer/focus behavior and a landing integration test covering quick-pack -> journey progression -> lead route preview continuity.
- [x] Week 3 implementation started (2026-03-04).
  - Added query-cluster opportunity scoring and recommendation payloads in insights hub.
  - Added persona-first IA cards and auto-run opportunity defaults in marketing snapshot.
  - Expanded `llms.txt` retrieval guidance and source confidence conventions.
  - Unified contact + landing routing logic via shared intake routing helpers.
  - Added standardized UI state helpers and weekly query-cluster KPI snapshot automation.
  - Added funnel friction alerts + automation recommendations with one-click default application in marketing snapshot.
  - Added dynamic contact route action plans (response target + preparation checklist + route-specific guide links).
  - Replaced trust-strip and social-proof copy with defensible, professional product-quality signals.
  - Added funnel health diagnostics (`funnel_health_score`, `top_bottleneck_stage`) to insights summary and snapshot rendering.
  - Added state-aware auto-apply defaults in marketing snapshot with explicit preference toggle and enabled-state controls.
  - Added contact goal-template quick starters and usage telemetry for faster, higher-quality intake submissions.
- [x] Week 3 Wave 8 extension complete (2026-03-05).
  - Added `weekly_playbook` generation to insights hub using inferred use case, team size, and follow-up route confidence.
  - Added marketing snapshot weekly playbook rendering with one-click open-intake CTA prefilled from playbook context.
  - Added telemetry event `marketing_snapshot_playbook_intake_opened` and corresponding analytics contract/test coverage.
- [x] Week 3 Wave 9 extension complete (2026-03-05).
  - Added explainability fields (`confidence_reason`, `route_rationale`, `assumptions`, `requires_manual_review`) to weekly playbook output.
  - Added low-confidence automation guardrails in marketing snapshot (pause auto-run query and auto-apply defaults when playbook confidence is low).
  - Added contact route-hint reconciliation UI + telemetry event `contact_playbook_route_reconciled` for suggested-vs-resolved routing insight.
- [x] Week 3 Wave 10 extension complete (2026-03-05).
  - Added landing playbook step-completion controls and persisted progress tracking for weekly execution tasks.
  - Added `playbook_execution` adoption metrics to insights hub and snapshot rendering (`completed_steps`, `sessions_with_completion`, `active_playbooks`, `adoption_rate`).
  - Added telemetry event `marketing_snapshot_playbook_step_updated` with analytics API/contract/test coverage.
- [x] Week 3 Wave 11 extension complete (2026-03-05).
  - Added `playbook_outcome_delta` to insights hub to compare baseline vs follow-up CTR/inquiry/schedule rates after playbook completion starts.
  - Added outcome-delta rendering in marketing snapshot playbook lines with confidence and sample-size context.
  - Extended dashboard API contract tests to cover new outcome-delta response shape.
- [x] Week 3 Wave 12 extension complete (2026-03-05).
  - Added `playbook_recovery_recommendations` to insights hub, generated from outcome-delta regressions and positive momentum signals.
  - Added `Outcome Recovery Actions` rendering in marketing snapshot with one-click run-query controls tied to each recommendation.
  - Added telemetry event `marketing_snapshot_recovery_query_run` with analytics API/contract/test coverage.
- [x] Week 3 Wave 13 extension complete (2026-03-05).
  - Added `marketing-snapshot-auto-run-recovery` toggle with persisted preferences and default-on behavior.
  - Added confidence-gated recovery autorun flow that prefers highest-priority recommendation and dedupes by snapshot fingerprint.
  - Extended recovery-query telemetry with `source` (`manual_click` vs `auto_run_default`) and validated schema coverage in analytics tests.
- [x] Week 3 Wave 14 extension complete (2026-03-05).
  - Added `recovery_outcome_delta` in insights hub to measure baseline vs follow-up funnel shifts after recovery queries begin.
  - Added `recovery_escalation_actions` and `Recovery Impact & Escalation` rendering in marketing snapshot with one-click escalation queries.
  - Added telemetry event `marketing_snapshot_recovery_escalation_run` with analytics API/contract/test coverage.
- [x] Week 3 Wave 15 extension complete (2026-03-05).
  - Added `marketing-snapshot-auto-run-escalation` toggle with strict fail-safe gates (high confidence, comparison ready, >=2 recovery runs, unresolved deltas).
  - Added `source` attribution (`manual_click` vs `auto_run_default`) to `marketing_snapshot_recovery_escalation_run`.
  - Added `recovery_escalation_attribution` payload and snapshot rendering to audit per-action escalation adoption and execution mode mix.
- [x] Week 3 Wave 16 extension complete (2026-03-05).
  - Added escalation cooldown preference controls (`6/12/24/48h`) and cooldown-aware auto-escalation gating in marketing snapshot.
  - Added `success_score` + `recommended_mode` on `recovery_escalation_attribution.actions` and surfaced them in escalation impact rendering.
  - Added `automation_tuning_rules` generation + snapshot rendering and one-pass default application telemetry via `marketing_snapshot_tuning_rule_applied`.
  - Validated with `npm run typecheck`, focused Wave 16 unit suites, full `npm test`, and `npm run build:client`.
- [x] Week 3 Wave 17 extension complete (2026-03-05).
  - Added global pause/resume controls for auto-runs in marketing snapshot (`Pause 6h`, `Pause 24h`, `Resume`) plus live pause-state messaging.
  - Extended marketing snapshot preferences with `auto_run_pause_until` and added cleanup for expired/invalid pause windows.
  - Made auto tuning-rule application, auto default-apply flows, and all auto query runs pause-aware while retaining manual run controls.
  - Added Wave 17 regression coverage in marketing snapshot state/controller/template tests and validated with `npm run typecheck`, focused unit suites, full `npm test`, and `npm run build:client`.
- [x] Week 3 Wave 19 extension complete (2026-03-05).
  - Added `Automation Execution State` diagnostics UI in marketing snapshot to expose the exact run/blocked status of top-opportunity, recovery, and escalation auto-runs.
  - Added explicit blocking diagnostics for low-confidence windows, missing comparison readiness, non-empty search input, escalation fail-safe criteria, and cooldown remaining time.
  - Added diagnostics lines for global pause state, tuning-rule auto-apply readiness, and default automation auto-apply targets.
  - Added Wave 19 regression coverage in marketing snapshot controller/template tests and validated with `npm run typecheck` plus focused unit suites.
- [x] Week 3 Wave 21 extension complete (2026-03-05).
  - Added automation shortcut controls (`Run Next Auto Action`, `Clear Query & Retry Auto-Runs`, `Apply Tuning Rules Now`) to reduce operator friction when auto flows are blocked.
  - Introduced shared execution-state computation in the marketing snapshot controller and reused it for both diagnostics rendering and shortcut behavior.
  - Added manual tuning-rule apply path (`manual_sync`) so teams can accept recommendations explicitly in low-confidence windows without disabling guardrails globally.
  - Added Wave 21 regression coverage in marketing snapshot controller/template tests and validated with `npm run typecheck` plus focused unit suites.
