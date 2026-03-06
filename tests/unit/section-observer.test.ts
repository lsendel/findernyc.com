import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initSectionObserverController } from '../../src/assets/js/section-observer';

const originalIntersectionObserver = window.IntersectionObserver;

describe('section observer controller', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: originalIntersectionObserver,
    });
  });

  it('observes trackable sections and records section_view once per section', () => {
    document.body.innerHTML = `
      <section data-section="hero"></section>
      <section data-section="features"></section>
    `;

    let callback!: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;
    const observe = vi.fn();

    class MockIntersectionObserver {
      root = null;
      rootMargin = '0px';
      thresholds = [0.5];
      constructor(cb: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void) {
        callback = cb;
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: MockIntersectionObserver,
    });

    const trackEvent = vi.fn();
    const sectionsViewed = new Set<string>();
    initSectionObserverController({ trackEvent, sectionsViewed });

    const sections = Array.from(document.querySelectorAll('section[data-section]'));
    expect(observe).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledWith(sections[0]);
    expect(observe).toHaveBeenCalledWith(sections[1]);

    const hero = sections[0] as HTMLElement;
    callback(
      [{ isIntersecting: true, target: hero } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    callback(
      [{ isIntersecting: true, target: hero } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith({
      event_name: 'section_view',
      properties: { section_name: 'hero' },
    });
    expect(sectionsViewed.has('hero')).toBe(true);
  });

  it('no-ops when IntersectionObserver is unavailable', () => {
    document.body.innerHTML = `<section data-section="hero"></section>`;
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const trackEvent = vi.fn();
    expect(() => {
      initSectionObserverController({ trackEvent, sectionsViewed: new Set<string>() });
    }).not.toThrow();
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
