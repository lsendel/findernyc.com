# Analytics Taxonomy

Canonical event enum is defined in:

- `/Users/lsendel/Projects/findernyc.com/src/contract.ts`

## Events

- `cta_click`
  - Properties: `cta_label`, `section`
- `section_view`
  - Properties: `section_name`
- `faq_expand`
  - Properties: `question_index`
- `pricing_tab_view`
  - Properties: `tab_name`

## Compliance Rules

- Client event names must be a subset of contract enum.
- If `navigator.doNotTrack === '1'`, behavioral tracking must be suppressed.
- CTA elements must include both `data-cta` and `data-section` for attribution.
