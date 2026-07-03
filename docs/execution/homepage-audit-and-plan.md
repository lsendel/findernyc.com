# Homepage Audit & Improvement Plan

## The Core Problem

The findernyc.com homepage tries to serve **three completely different audiences** on one scrolling page, and the result is a confused, overwhelming experience. A resident looking for weekend events sees marketing dashboards. A marketer sees inquiry forms. An operator sees vibe quizzes. Nobody gets a clean path.

---

## Section-by-Section Audit

### 1. Hero (Good, minor issues)
**What's there**: "Discover Hidden Local Gems Right in Your City" + two CTAs + hero image
**What works**: Clear value prop, strong headline, dual CTA for consumers vs businesses
**Issues**:
- Sub-headline says "Built for local residents, marketers, and event operators" — this dilutes the emotional hook. A resident doesn't care that it's also for marketers.
- Hero image is a generic placeholder SVG, not a real photo of NYC events

### 2. "Choose Your Primary Workflow" (Wrong audience, wrong placement)
**What's there**: Three cards — Residents, Marketers, Operators — each with internal jargon
**Problem**: This is an **internal product routing screen**, not marketing content. Terms like "structured intake and routing previews", "partnership review tracks", and "high-intent query clusters" are SaaS product language, not landing page copy. A resident looking for jazz in Brooklyn will bounce immediately.
**Verdict**: Remove from homepage entirely. Move to a post-signup onboarding flow.

### 3. Smart Search + Inquiry Profile + Scheduling + Saved Alerts (App UI on a landing page)
**What's there**: A fully interactive search form, inquiry profile fields (name, email, phone), calendar scheduling picker, saved search alerts panel — all exposed on the homepage
**Problem**: This is the **entire application** embedded in the landing page. It's ~5 full screens of forms and controls. A first-time visitor hasn't decided to use the product yet — showing them the full app is overwhelming and confusing. The "One-Click Inquiry Profile" form asks for name/email/phone before the user has even seen a search result.
**Verdict**: Remove all of this from the landing page. Replace with a simple search demo/preview that shows what results look like, not the actual app.

### 4. "Metadata freshness governance" / "Schema + SEO integrity" / "Intake routing parity" (Internal ops badges)
**What's there**: Six cards with internal quality metrics — "Fail-closed ops controls", "Weekly KPI cluster reports", etc.
**Problem**: These are **internal engineering/ops quality signals**, not customer-facing content. No visitor cares about "intake routing parity" or "accessibility quality gates". This looks like a CI dashboard accidentally rendered on the homepage.
**Verdict**: Remove entirely.

### 5. "Finding cool things to do in your city is broken" (Good, keep)
**What's there**: Three pain points (Endless Scroll, Big Venues, Word of Mouth) + comparison graphic
**What works**: Emotional, relatable, consumer-friendly copy. This is the best section on the page.
**Verdict**: Move this UP — it should come right after the hero as the "problem" section.

### 6. "Meet your neighborhood scout" (Good, keep)
**What's there**: Solution positioning with three value props + app preview image
**What works**: Clean consumer messaging, clear benefits
**Verdict**: Keep, follows naturally after the problem section.

### 7. "Get started in 3 easy steps" (Good, keep)
**What's there**: Vibe Quiz -> See Events -> Go Do Something
**What works**: Simple, clear onboarding story
**Verdict**: Keep as-is.

### 8. "Everything you need to never miss out again" (Good, keep)
**What's there**: 6 feature cards — Hyper-Local Radar, Vibe Matching, Hidden Gem Alerts, Save & Share, Event Map View, Business Spotlights
**What works**: Consumer-friendly feature names, good icons
**Verdict**: Keep.

### 9. "Operational outcomes from active workflow teams" (Wrong audience)
**What's there**: Three-column layout for Discovery/Marketing/Operator teams with italicized workflow descriptions + "Execution principle: Ship measurable improvements weekly"
**Problem**: This is **internal team documentation** rendered as a marketing section. "Cluster optimization", "Repeatable rollout", and "Ship measurable improvements weekly" are internal ops mantras, not customer value props.
**Verdict**: Remove from homepage. If needed for B2B, move to a separate /for-businesses page.

### 10. Marketing Snapshot Dashboard (Wrong audience, dangerous)
**What's there**: A full marketing analytics dashboard with KPI cards (Search CTR, Inquiry Rate, Schedule Rate), query clusters, recommended next actions with "Run Query" buttons, funnel friction alerts, automation tuning rules, auto-run controls, weekly execution playbook with "Mark Complete" buttons, recovery/escalation panels
**Problem**: This is an **admin dashboard** on the public homepage. It exposes internal business metrics, automation controls, and operational state to every visitor. It shows "Loading metrics...", "--" placeholders, and "0/0" counters which look broken. The "Pause Auto-Runs" and "Run Query" buttons are operational controls that don't belong on a landing page.
**Verdict**: Remove entirely from homepage. This belongs behind authentication on a /dashboard route.

### 11. Pricing (Good, minor issues)
**What's there**: Consumer/Business tabs, Free + $49/month plans
**What works**: Clean layout, clear tiers
**Issues**: The "For Businesses" tab content isn't visible — need to verify it works. Add-on pricing mentioned at bottom is vague.

### 12. FAQ (Good, keep)
**What's there**: 7 accordion questions
**What works**: Relevant questions, clean UI
**Verdict**: Keep.

### 13. Signup/Waitlist Section (Overcomplicated)
**What's there**: "30-Second Setup Assistant" with role selection, city/borough/team size fields, checkboxes for "Instant role setup", "Auto-create a saved alert", "Use setup profile to prefill forms", plus a "Setup Journey" progress tracker, PLUS a separate waitlist email form with use case/team size/city fields and routing preview
**Problem**: Two competing signup mechanisms stacked on top of each other. The "Setup Assistant" is product onboarding that belongs post-signup. The waitlist form asks too many questions — email + one optional field is enough for a waitlist.
**Verdict**: Simplify to ONE clear waitlist form: email + optional use case. Move the setup assistant to post-signup.

### 14. Final CTA + Footer (Good)
**What's there**: "Something amazing is happening near you right now" + dual CTAs + footer nav
**What works**: Emotional closer, clean footer
**Verdict**: Keep.

---

## Navigation Issues

Current nav: `Features | How It Works | Pricing | For Businesses | [Get Started Free]`

**Problems**:
- "For Businesses" links to #pricing (same as Pricing) — redundant
- No clear separation between consumer and business paths
- No anchor IDs match the actual valuable sections

**Recommended nav**:
`How It Works | Features | Pricing | For Businesses | [Get Started Free]`

Where "For Businesses" goes to a separate /for-businesses page (not an anchor on the same page).

---

## The Audience Confusion Problem

The page mixes three completely different content types:

| Content Type | Who It's For | Examples on Page |
|---|---|---|
| **Consumer marketing** | Residents finding events | Hero, pain points, features, 3 steps, pricing |
| **B2B/SaaS product** | Marketers, operators | Workflow cards, operational outcomes, marketing snapshot |
| **Internal ops/app UI** | Logged-in users, admins | Smart search forms, inquiry profile, scheduling, saved alerts, auto-run controls, playbook steps |

All three are interleaved on one page. The fix is to **separate them completely**.

---

## Recommended Page Structure (New Order)

```
1. Hero — "Discover Hidden Local Gems" (keep, clean up sub-headline)
2. Pain Points — "Finding cool things is broken" (move UP from section 5)
3. Solution — "Meet your neighborhood scout" (keep)
4. How It Works — "3 easy steps" (keep)
5. Features — "Everything you need" (keep, 6 cards)
6. Social Proof — (new: add testimonials or press mentions)
7. Pricing — Consumer + Business tabs (keep)
8. FAQ — (keep)
9. Waitlist CTA — Simple email form (simplify massively)
10. Final CTA + Footer — (keep)
```

**Removed from homepage** (moved elsewhere):
- "Choose Your Primary Workflow" -> post-signup onboarding
- Smart Search + Inquiry + Scheduling + Alerts -> the actual app (behind auth or /app route)
- Internal ops badges -> remove
- Operational outcomes -> /for-businesses page
- Marketing Snapshot dashboard -> /dashboard (authenticated)
- Setup Assistant + Journey tracker -> post-signup onboarding

---

## Implementation Plan

### Phase 1: Remove (immediate, high impact)
Remove sections that hurt credibility:
1. Remove internal ops badges section (metadata freshness, SEO integrity, etc.)
2. Remove the full Marketing Snapshot dashboard
3. Remove the operational outcomes section
4. Remove the Smart Search app UI (search, inquiry profile, scheduling, saved alerts)
5. Remove the "Choose Your Primary Workflow" cards

### Phase 2: Reorder (same day)
Move remaining good sections into the recommended order:
1. Hero
2. Pain points (moved up)
3. Solution
4. How it works
5. Features
6. Pricing
7. FAQ
8. Waitlist (simplified)
9. Final CTA + Footer

### Phase 3: Simplify Signup (same day)
Replace the current dual signup (Setup Assistant + Waitlist form) with:
- One email input + "Join the Waitlist" button
- Optional: one dropdown for use case
- Remove: city, borough, team size, checkboxes, journey tracker, routing preview

### Phase 4: Add Missing Elements (next iteration)
- Social proof section (testimonials, user count, press logos)
- Real event photos instead of SVG placeholders
- A visual search demo/preview (showing what results look like, not the actual form)
- Separate /for-businesses landing page with B2B content

### Phase 5: Navigation Cleanup
- Make "For Businesses" link to /for-businesses (new page)
- Ensure all nav anchors match actual section IDs
- Add mobile nav testing

---

## Expected Impact

| Metric | Before | After |
|---|---|---|
| Page length | ~14,000px (massive) | ~6,000px (focused) |
| Sections | 14 (mixed audiences) | 10 (consumer-focused) |
| Forms on page | 5+ (search, inquiry, scheduling, setup, waitlist) | 1 (waitlist email) |
| Time to understand product | Confusing — user must scroll past dashboards | Clear within first 2 screens |
| Bounce risk | High — internal ops content breaks trust | Low — clean consumer journey |
