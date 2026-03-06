import { beforeAll, describe, expect, it } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';
import { contactPageHtml } from '../../src/templates/contact';
import { contentPageHtml, type ContentPage } from '../../src/templates/content-page';

let landingDoc: Document;
let contactDoc: Document;
let contentDoc: Document;

beforeAll(() => {
  const parser = new DOMParser();
  landingDoc = parser.parseFromString(landingPageHtml(), 'text/html');
  contactDoc = parser.parseFromString(contactPageHtml(), 'text/html');
  const page: ContentPage = {
    path: '/about',
    title: 'About LocalGems',
    description: 'About page',
    heading: 'About LocalGems',
    body: ['Line one', 'Line two'],
    publishedAt: '2026-02-27',
    updatedAt: '2026-03-04',
  };
  contentDoc = parser.parseFromString(contentPageHtml(page), 'text/html');
});

describe('Usability flow templates', () => {
  it('renders landing route preview controls for lead capture', () => {
    expect(landingDoc.querySelector('#lead-submit-button')).not.toBeNull();
    expect(landingDoc.querySelector('#lead-route-preview')).not.toBeNull();
    expect(landingDoc.querySelector('#onboarding-instant-apply')).not.toBeNull();
    expect(landingDoc.querySelector('#persona-paths')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-auto-run-top')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-auto-run-recovery')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-auto-run-escalation')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-escalation-cooldown-hours')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-auto-apply-recommended')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-pause-auto-run-6h')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-pause-auto-run-24h')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-resume-auto-run')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-run-next-auto-action')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-clear-query-retry-auto')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-apply-tuning-rules-now')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-auto-run-pause-state')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-alerts')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-automations')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-tuning-rules')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-automation-state')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-playbook')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-playbook-progress')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-playbook-recovery')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-recovery-impact')).not.toBeNull();
    expect(landingDoc.querySelector('#marketing-snapshot-open-intake')).not.toBeNull();
  });

  it('renders contact route preview controls and next-step action', () => {
    expect(contactDoc.querySelector('#contact-submit-button')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-preview')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-next-action')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-readiness-score')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-readiness-list')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-goal-templates')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-goal-template-buttons')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-plan-title')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-sla')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-hint')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-rationale')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-plan-list')).not.toBeNull();
    expect(contactDoc.querySelector('#contact-route-guide')).not.toBeNull();
    expect(contactDoc.querySelector('script[src="/js/contact.js"]')).not.toBeNull();
  });

  it('renders content workflow shortcuts and current breadcrumb crumb', () => {
    expect(contentDoc.querySelector('#content-workflow-status')).not.toBeNull();
    expect(contentDoc.querySelector('#content-workflow-primary')).not.toBeNull();
    expect(contentDoc.querySelector('#content-workflow-intake')).not.toBeNull();
    expect(contentDoc.querySelector('.content-page-breadcrumb [aria-current="page"]')).not.toBeNull();
    expect(contentDoc.querySelector('.content-page-updated')?.textContent).toContain('2026-03-04');
    expect(contentDoc.querySelector('script[src="/js/content-workflow.js"]')).not.toBeNull();
  });
});
