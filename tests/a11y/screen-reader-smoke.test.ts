import { describe, expect, it } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';

describe('Screen-reader smoke checks', () => {
  it('includes sufficient live regions for async status updates', () => {
    document.documentElement.innerHTML = landingPageHtml();
    const liveRegions = document.querySelectorAll('[aria-live]');
    expect(liveRegions.length).toBeGreaterThanOrEqual(6);
  });

  it('has labels for interactive controls and landmark structure', () => {
    document.documentElement.innerHTML = landingPageHtml();
    const controls = Array.from(document.querySelectorAll('input, select, textarea, button'));
    const unlabeled = controls.filter((control) => {
      const id = control.getAttribute('id');
      const hasAriaLabel = Boolean(control.getAttribute('aria-label')?.trim());
      const hasForLabel = id ? Boolean(document.querySelector(`label[for="${id}"]`)) : false;
      const wrappedByLabel = Boolean(control.closest('label'));
      const hasTextLabel = Boolean(control.textContent?.trim());
      return !(hasAriaLabel || hasForLabel || wrappedByLabel || hasTextLabel);
    });

    expect(unlabeled).toHaveLength(0);
    expect(document.querySelector('header')).not.toBeNull();
    expect(document.querySelector('main')).not.toBeNull();
    expect(document.querySelector('footer')).not.toBeNull();
  });
});
