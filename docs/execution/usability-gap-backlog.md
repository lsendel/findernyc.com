# Usability And Feature Gap Backlog

## Scope
Improve usability, feature discoverability, and conversion workflows across all public screens (home, contact, content pages) with a marketing outcome focus: stronger Google + LLM visibility and better discovery-to-action flow.

## Prioritized Backlog

### P0 (Implemented)
- [x] Make search happy path actionable by default.
  - Enabled default flags for inquiry + scheduling + richer ranking context.
  - Added visible 3-step journey in Smart Search (`Search -> Start Inquiry -> Schedule Hold`).
  - Upgraded result-card actions to emphasize `Start Inquiry` first.
- [x] Reduce friction in post-search actions.
  - Added `Auto-schedule after inquiry` default toggle.
  - Preserved one-click saved alert and compare workflows.
- [x] Professional visual baseline refresh.
  - Updated typography and palette to reduce “vibe-coded” feel.
  - Improved button hierarchy and structural consistency.

### P1 (Implemented)
- [x] Reorganize content page IA for practical decision-making.
  - Added right-rail `Recommended Next Step`, `What You Will Learn`, and `Built For` blocks.
  - Added explicit action CTAs by page intent (analytics, partnership, blog).
- [x] Improve contact page utility and routing clarity.
  - Added structured sidebar (`What Happens Next`, `Best Fit For`, `Before You Submit`).
  - Kept the existing form contract while improving context and framing.

### P1 (Implemented)
- [x] Add trust-proof modules specific to marketers on analytics + partnership pages.
  - Added proof snapshot cards with KPI deltas and timeline-style context.
- [x] Add explicit LLM-ready answer blocks to each blog page.
  - Added visible direct-answer sections plus FAQ JSON-LD for retrieval-friendly indexing.

### P2 (Implemented)
- [x] Split advanced operations controls into dedicated route (`/ops`) with auth guard.
  - Added `/ops` route with optional token guard (`OPS_ACCESS_TOKEN`) and default `noindex`.
  - Public route now keeps advanced controls hidden unless in ops workspace mode.
- [x] Add progressive disclosure for beginner vs advanced user modes.
  - Added `Show advanced operator controls` toggle to keep first-use flow minimal.

### P2 (Implemented)
- [x] Add instrumentation for flow quality.
  - Added `search -> inquiry -> schedule` timing fields (`seconds_from_search`, `seconds_from_inquiry`).
  - Added `auto_triggered` / `auto_schedule_enabled` attributes for scheduling adoption insights.

### P1 (Implemented - Wave 2)
- [x] Add pre-submit routing transparency in lead and contact flows.
  - Added live route preview text (`community_waitlist`, `self_serve_onboarding`, `marketing_consult`, `sales_demo`, `partnership_review`).
  - Added adaptive submit labels so user intent matches CTA language.
- [x] Reduce form abandonment in contact flow.
  - Added local draft autosave/restore for contact form fields.
  - Clears draft on successful submit and preserves next-step CTA guidance.
- [x] Improve cross-screen continuity for content pages.
  - Added sidebar `Your Workflow` shortcuts that personalize actions from onboarding profile.
  - Improved breadcrumb orientation by showing current page crumb (`aria-current="page"`).

### P1 (Implemented - Wave 3)
- [x] Accelerate onboarding with role-first quick packs.
  - Added `Instant role setup` toggle and default quick-pack behavior to apply defaults on role selection.
  - Added role-specific team-size defaults for faster setup (`consumer -> solo`, `marketer/business -> small_2_10`).
- [x] Add conversion instrumentation for preview and submission intent.
  - Added analytics events for route-preview changes and submit attempts on both landing and contact surfaces.
  - Added onboarding defaults applied event with `apply_mode` (`manual` vs `quick_pack`) and preference context.
- [x] Measure contact draft recovery behavior.
  - Added analytics event for draft restore with `restored_fields` count to track interruption recovery rate.

### P1 (Implemented - Wave 4)
- [x] Add query-cluster ranking insights with actionable recommendations.
  - Extended insights hub with query cluster summaries (`searches`, `CTR`, `inquiry`, `schedule`, `opportunity_score`).
  - Added prioritized recommendation payloads (`focus_stage`, `priority`, `suggested_query`) for next-step optimization.
- [x] Improve landing information architecture for persona-first entry.
  - Added `Choose Your Primary Workflow` cards for resident, marketer, and operator paths.
  - Added auto-run toggle for top opportunity queries in marketing snapshot to reduce repetitive setup actions.
- [x] Strengthen contact submission confidence and prefill quality.
  - Added dynamic submission readiness checklist (`email`, `intent`, `team`, `location`, `goal depth`).
  - Expanded onboarding-profile prefill into contact flow (use case, team size, city, role-aligned goal starter).
- [x] Improve LLM retrieval guidance quality.
  - Expanded `llms.txt` with canonical route priorities, freshness/citation conventions, and source confidence rules.

### P1 (Implemented - Wave 5)
- [x] Unify client-side intake routing logic across landing and contact.
  - Added shared intake routing module used by `main.ts`, `contact.ts`, and content workflow personalization.
  - Refactored contact flow into dedicated bundled script (`/js/contact.js`) instead of inline page logic.
  - Extracted landing lead-capture flow from `main.ts` into a dedicated controller module for safer iteration.
  - Extracted onboarding assistant flow from `main.ts` into a dedicated controller module for safer iteration.
  - Extracted journey progress flow from `main.ts` into a dedicated controller module for safer iteration.
  - Extracted section observer and FAQ accordion flows from `main.ts` into dedicated controller modules for safer iteration.
  - Extracted pricing tabs and mobile carousel flows from `main.ts` into dedicated controller modules for safer iteration.
  - Extracted mobile navigation flow from `main.ts` into a dedicated controller module for safer iteration.
- [x] Standardize loading/success/error/empty states.
  - Added reusable client helpers (`setStatusState`, `renderListState`) and shared UI state classes (`ui-status-*`, `ui-list-state-*`).
  - Applied standardized state rendering to lead capture and marketing snapshot flows.
- [x] Add automated weekly KPI cluster snapshot artifacts.
  - Added `scripts/agents/weekly-kpi-query-clusters.mjs` to produce weekly cluster deltas and funnel KPI trend artifacts in `output/agent-reports/`.
  - Added npm command `agent:weekly-kpi-query-clusters` and wired it into `scripts/agents/run-all.mjs`.
- [x] Close backend/frontend routing parity gap.
  - Updated intake decision policy for mid-market `demo/consult` intent without explicit use-case to route `sales_demo` with `high` priority.

### P1 (Implemented - Wave 7)
- [x] Add focused onboarding quick-pack behavior coverage.
  - Added unit coverage for URL-driven role recommendation + auto quick-pack apply.
  - Added dedupe coverage so existing recent auto-alert fingerprints do not recreate alerts.
  - Added preference-toggle persistence coverage for auto-alert + autofill state drafts.
- [x] Add focused journey-progress continuity coverage.
  - Added unit coverage for next-step CTA sequencing (`setup -> search -> alert -> intake`).
  - Added rerender coverage for `localgems:onboarding-updated` and `localgems:journey-update` events.
- [x] Add focused section + FAQ behavior coverage.
  - Added section observer coverage for intersection tracking and dedupe semantics.
  - Added FAQ accordion coverage for exclusive expand behavior and open-index state transitions.
- [x] Add focused pricing + carousel behavior coverage.
  - Added pricing tab coverage for panel switching and `pricing_tab_view` telemetry emission.
  - Added mobile carousel coverage for dot navigation, swipe transitions, and desktop no-op behavior.
- [x] Add focused mobile-nav + cross-flow integration coverage.
  - Added mobile-nav coverage for drawer open/close controls, escape handling, and focus-trap behavior.
  - Added landing integration coverage for onboarding quick-pack defaults, journey CTA advancement, and lead route-preview continuity.
  - Extracted Smart Search display helpers into `smart-search-display.ts` (label formatters, preset summary, compare panel renderer) and wired `main.ts` to shared rendering logic.
  - Extracted fraud-ops dashboard/queue render helpers into `fraud-ops.ts` and wired `main.ts` to shared fraud rendering logic.
  - Extracted saved-search request/render helpers into `saved-searches.ts` and wired both smart-search alerts and onboarding auto-alert flows to shared helpers.
  - Extracted inquiry-profile compaction/storage/load helpers into `inquiry-profile.ts` and wired `main.ts` to shared profile persistence logic.
  - Extracted AI + experience request wrappers into `ai-experience-client.ts` and wired `main.ts` to shared endpoint clients.
  - Extracted dashboard/partner/availability/fraud/webhook request wrappers into `ops-api-client.ts` and wired `main.ts` to shared operations clients.
  - Extracted one-click inquiry + calendar scheduling request wrappers into `inquiry-scheduling-client.ts` and wired `main.ts` to shared scheduling clients.
  - Extracted marketing snapshot playbook-progress/preference storage helpers into `marketing-snapshot-state.ts` and wired `main.ts` to shared state contracts.
  - Extracted marketing snapshot orchestration into `marketing-snapshot-controller.ts` and wired `main.ts` to a thin controller bootstrap.
  - Fixed lead success rerender behavior so route-specific next-action CTA remains visible after successful submit.
  - Added focused lead-capture success-path coverage to ensure server `follow_up.route` drives route-specific next-action derivation.
  - Added focused saved-search helper coverage for request contracts, list rendering actions, and empty-state fallbacks.
  - Added focused inquiry-profile helper coverage for storage sanitization, remote loading, and failure fallbacks.
  - Added focused AI + experience client coverage for method contracts, encoded URLs, and payload serialization behavior.
  - Added focused ops API client coverage for dashboard/partner/availability/fraud method contracts and signed-webhook header generation.
  - Added focused inquiry-scheduling client coverage for one-click autofill payload defaults, `204` response handling, and conflict response pass-through.
  - Added focused marketing snapshot state coverage for playbook key normalization, localStorage preference defaults/persistence, and step-index sanitization.
  - Added focused marketing snapshot controller coverage for top-opportunity auto-run behavior and playbook-intake telemetry emission.

### P1 (Implemented - Wave 6)
- [x] Surface funnel friction alerts and automation defaults directly in marketing snapshot.
  - Extended insights hub payload with `funnel_friction_alerts` and `automation_recommendations`.
  - Added landing UI blocks for friction alerts and one-click "apply default" automation actions.
- [x] Improve contact happy-path clarity with dynamic route action plans.
  - Added route-specific action plan module (`title`, `response target`, preparation checklist, guide link).
  - Kept route preview and action plan aligned to server-confirmed route after successful submit.
- [x] Strengthen professional trust positioning on landing.
  - Replaced unverifiable trust-strip claims with defensible product-quality signals (metadata governance, routing parity, accessibility checks, weekly KPI reporting, fail-closed ops controls).
  - Reframed social-proof section around measurable workflow outcomes instead of testimonial-style copy.

### P1 (Implemented - Wave 7)
- [x] Add state-aware automation optimization in marketing snapshot.
  - Added session preference toggle to auto-apply recommended automations (`#marketing-snapshot-auto-apply-recommended`).
  - Added enabled-state awareness for automation controls so already-enabled defaults are shown as applied.
  - Added telemetry event `marketing_snapshot_automation_applied` with source attribution (`manual_click` vs `auto_apply_defaults`).
- [x] Improve marketer insight clarity with funnel health diagnostics.
  - Added `funnel_health_score` and `top_bottleneck_stage` to insights hub summary payload.
  - Surfaced health and bottleneck context directly in marketing snapshot and insights summary rendering.
- [x] Reduce contact-form goal friction with guided starters.
  - Added dynamic use-case goal templates in contact flow with one-click insertion and autosave parity.
  - Added telemetry event `contact_goal_template_applied` for template usage visibility and optimization loops.

### P1 (Implemented - Wave 8)
- [x] Convert insights into an execution-ready weekly playbook.
  - Added `weekly_playbook` to insights hub summary payload with a use-case/team-size aligned goal and prioritized execution steps.
  - Derived playbook defaults from existing intake routing policy so recommendations map to concrete follow-up routes.
- [x] Add one-click playbook activation on landing.
  - Added marketing snapshot playbook block (`#marketing-snapshot-playbook`) with a direct CTA (`#marketing-snapshot-open-intake`) that opens contact intake with prefilled context.
  - Included explicit step copy to reduce interpretation work for marketers during weekly planning.
- [x] Add telemetry for playbook-driven workflow adoption.
  - Added analytics event `marketing_snapshot_playbook_intake_opened` with `surface`, `use_case`, `team_size`, `route`, and `confidence`.
  - Extended contract and API analytics tests to keep event schema parity enforced.

### P1 (Implemented - Wave 9)
- [x] Add explainable routing context to weekly playbook output.
  - Extended `weekly_playbook` with `confidence_reason`, `route_rationale`, `assumptions`, and `requires_manual_review`.
  - Added low-signal guardrails so low-confidence playbooks explicitly require manual assumption review.
- [x] Improve cross-screen routing clarity from landing snapshot to contact intake.
  - Prefilled contact links now carry playbook route hints and rationale context.
  - Contact flow now renders route reconciliation messaging when playbook suggestion and live form routing diverge.
- [x] Add telemetry for route-hint reconciliation quality.
  - Added analytics event `contact_playbook_route_reconciled` (`hinted_route`, `resolved_route`, `aligned`, optional `confidence`).
  - Extended analytics API + contract + unit coverage for the new reconciliation event schema.

### P1 (Implemented - Wave 10)
- [x] Add execution-loop tracking for weekly playbook steps.
  - Added in-UI step completion controls and persisted progress state for weekly playbook actions.
  - Added playbook progress summary (`completed/total`) directly in marketing snapshot.
- [x] Add adoption insights to backend hub payload.
  - Extended insights hub with `playbook_execution` metrics (`completed_steps`, `sessions_with_completion`, `active_playbooks`, `adoption_rate`).
  - Surfaced team-level execution adoption context alongside weekly playbook rationale.
- [x] Add analytics contract for playbook step completion events.
  - Added telemetry event `marketing_snapshot_playbook_step_updated` with step index, completion state, route, and confidence context.
  - Extended analytics API + contract + unit coverage for schema parity.

### P1 (Implemented - Wave 11)
- [x] Add outcome-delta reporting tied to playbook completion milestones.
  - Added `playbook_outcome_delta` metrics comparing baseline vs follow-up funnel performance after first completed playbook step.
  - Included CTR, inquiry-rate, and schedule-rate deltas with sample-size context and confidence grading.
- [x] Surface playbook impact visibility in marketing snapshot.
  - Added outcome-delta messaging directly in the weekly playbook section with confidence-aware states (`unavailable`, `collecting`, `comparison ready`).
  - Kept progress and adoption context aligned so execution and impact can be reviewed in one place.

### P1 (Implemented - Wave 12)
- [x] Add outcome-driven recovery recommendations to insights hub output.
  - Added `playbook_recovery_recommendations` generation from negative/positive post-completion deltas.
  - Prioritized recommendation classes for CTR, inquiry, and scheduling recovery, plus momentum scale-up when outcomes improve.
- [x] Add one-click recovery action flow in landing marketing snapshot.
  - Added `Outcome Recovery Actions` rendering (`#marketing-snapshot-playbook-recovery`) with recommendation detail and direct run-query controls.
  - Kept recommendation states aligned to outcome-comparison readiness to avoid empty or ambiguous operator states.
- [x] Add analytics schema coverage for recovery-query execution.
  - Added telemetry event `marketing_snapshot_recovery_query_run` with recommendation id, priority, query text, and outcome confidence context.
  - Extended analytics API validation, contract enum, and unit tests to preserve schema parity.

### P1 (Implemented - Wave 13)
- [x] Add confidence-safe recovery auto-run default to marketing snapshot.
  - Added `#marketing-snapshot-auto-run-recovery` preference toggle with persisted local state in snapshot preferences.
  - Auto-runs the highest-priority recovery query only when outcome comparison exists and confidence is medium/high.
- [x] Prevent competing auto-run actions in the same refresh cycle.
  - Recovery auto-run now executes before top-opportunity auto-run and exits the cycle when triggered.
  - Added dedupe fingerprinting for recovery auto-run to avoid repeated query execution on unchanged snapshots.
- [x] Add manual-vs-automatic recovery attribution in analytics.
  - Extended `marketing_snapshot_recovery_query_run` payload with `source` (`manual_click` or `auto_run_default`).
  - Updated analytics API validation plus unit tests to enforce source schema parity.

### P1 (Implemented - Wave 14)
- [x] Add recovery impact delta reporting tied to recovery-query execution.
  - Added `recovery_outcome_delta` metrics that compare baseline vs follow-up funnel performance after first recovery query run.
  - Included run-volume context (`total_runs`, `sessions_with_run`) plus confidence-aware delta grading.
- [x] Add escalation guidance loop in marketing snapshot.
  - Added `recovery_escalation_actions` generation for unresolved CTR/inquiry/schedule gaps after recovery runs.
  - Added `Recovery Impact & Escalation` UI block (`#marketing-snapshot-recovery-impact`) with one-click escalation query actions.
- [x] Add escalation telemetry contract coverage.
  - Added analytics event `marketing_snapshot_recovery_escalation_run` with action id, priority, query text, and confidence context.
  - Extended analytics API validation, contract enum, and unit tests for schema parity.

### P1 (Implemented - Wave 15)
- [x] Add fail-safe auto-escalation defaults in marketing snapshot.
  - Added `#marketing-snapshot-auto-run-escalation` preference toggle with persisted state in marketing snapshot preferences.
  - Auto-escalation now requires strict gates: high-confidence recovery comparison, at least two recovery runs, unresolved negative/flat deltas, and empty query input.
- [x] Add escalation source attribution (`manual` vs `auto`) across telemetry.
  - Extended `marketing_snapshot_recovery_escalation_run` payload with `source` (`manual_click` or `auto_run_default`).
  - Updated analytics API validation and unit coverage for source schema parity.
- [x] Add escalation action attribution in insights hub payload.
  - Added `recovery_escalation_attribution` with totals (`manual_runs`, `auto_runs`) and per-action run/session/last-run metrics.
  - Surfaced attribution summary lines in `Recovery Impact & Escalation` so teams can audit which escalation actions are actually being used.

### P1 (Implemented - Wave 16)
- [x] Add configurable escalation cooldown controls for auto-run defaults.
  - Added `#marketing-snapshot-escalation-cooldown-hours` preference control (6/12/24/48h) with persisted state in marketing snapshot preferences.
  - Auto-escalation now honors cooldown windows via persisted per-fingerprint run state before triggering another default escalation query.
- [x] Add escalation action quality scoring to drive execution mode recommendations.
  - Extended `recovery_escalation_attribution.actions` with `success_score` and `recommended_mode` (`manual` or `auto`) based on follow-up recovery outcomes.
  - Surfaced score + recommended mode directly in `Recovery Impact & Escalation` rendering for operator-grade triage decisions.
- [x] Add default automation tuning rules and one-pass application telemetry.
  - Added `automation_tuning_rules` to insights hub payload and rendered the list in `#marketing-snapshot-tuning-rules`.
  - Added deterministic one-pass tuning-rule application in marketing snapshot with telemetry event `marketing_snapshot_tuning_rule_applied` (`rule_id`, `setting`, `confidence`, `source`).

### P1 (Implemented - Wave 17)
- [x] Add global pause/resume controls for marketing snapshot auto-runs.
  - Added quick controls (`#marketing-snapshot-pause-auto-run-6h`, `#marketing-snapshot-pause-auto-run-24h`, `#marketing-snapshot-resume-auto-run`) and live state text (`#marketing-snapshot-auto-run-pause-state`).
  - Persisted pause windows in marketing snapshot preferences via `auto_run_pause_until`.
- [x] Make all default automation branches pause-aware.
  - Short-circuited auto tuning-rule apply, auto automation-default apply, and auto query execution (top-opportunity, recovery, escalation) while pause windows are active.
  - Added expiration cleanup so stale/expired pause windows are removed automatically from persisted preferences.
- [x] Add regression coverage for pause controls and paused execution states.
  - Extended marketing snapshot state + controller tests for pause preference persistence and no-auto-run behavior during active pause windows.
  - Extended landing template usability checks to enforce pause-control presence in the rendered IA.

### P1 (Implemented - Wave 19)
- [x] Add explicit auto-run diagnostics in marketing snapshot.
  - Added `#marketing-snapshot-automation-state` to surface execution gates for top-opportunity, recovery, and escalation auto-runs.
  - Added explicit diagnostics for global pause state, tuning-rule eligibility, default auto-apply status, and escalation cooldown remaining time.
- [x] Improve operator explainability for blocked automation paths.
  - Auto-run diagnostics now explain blocking reasons (low confidence, missing comparison data, prefilled search input, fail-safe gate requirements).
  - Kept manual actions available while diagnostics report pause/cooldown restrictions.
- [x] Add regression coverage for automation-state IA and diagnostics rendering.
  - Extended controller tests to validate active-vs-paused diagnostics output.
  - Extended template usability checks to enforce the new automation-state diagnostics container.

### P1 (Implemented - Wave 21)
- [x] Add one-click automation shortcut controls in marketing snapshot.
  - Added `Run Next Auto Action`, `Clear Query & Retry Auto-Runs`, and `Apply Tuning Rules Now` controls inside the automation settings block.
  - Shortcuts keep operators in-context while reducing manual cross-section navigation.
- [x] Add reusable execution-state evaluation for diagnostics + manual shortcut actions.
  - Centralized auto-run gate evaluation (pause, confidence, comparison readiness, input occupancy, cooldown) into a shared controller computation path.
  - Reused the same gate state for diagnostics rendering and shortcut execution decisions to avoid logic drift.
- [x] Add manual override path for low-confidence tuning windows.
  - `Apply Tuning Rules Now` can apply rules with `manual_sync` source even when low-confidence auto-apply guardrails block automatic execution.
  - Added clear status feedback for changed vs already-synced controls.

### P1 (Implemented - Wave 20)
- [x] Close runtime analytics configuration gap between backend and client telemetry forwarding.
  - Extended `/api/config` payload with analytics provider metadata (`ga4_measurement_id`, `segment_write_key`, `providers.ga4`, `providers.segment`) using env-driven normalization.
  - Added a dedicated client analytics runtime module to parse config and forward events to GA4/Segment globals behind provider toggles.
- [x] Remove placeholder analytics integration guidance from production client code.
  - Replaced the tracking-id TODO block in `main.ts` with runtime-config-backed forwarding behavior.
  - Kept forwarding best-effort and non-blocking so primary event ingestion (`/api/analytics/events`) remains authoritative.
- [x] Add focused regression coverage for runtime analytics hardening.
  - Added unit tests for analytics runtime parsing defaults, provider normalization, and forwarding gates.
  - Added `/api/config` route tests for analytics env bindings and provider-flag derivation.
