import { afterEach, describe, expect, it } from 'vitest';
import { initCarouselController } from '../../src/assets/js/carousel';

const originalInnerWidth = window.innerWidth;

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function dispatchTouch(container: HTMLElement, type: 'touchstart' | 'touchend', clientX: number): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'changedTouches', {
    configurable: true,
    value: [{ clientX }],
  });
  container.dispatchEvent(event);
}

afterEach(() => {
  document.body.innerHTML = '';
  setViewportWidth(originalInnerWidth);
});

describe('carousel controller', () => {
  it('initializes dot navigation and swipe behavior on mobile', () => {
    setViewportWidth(390);
    document.body.innerHTML = `
      <div class="testimonials-grid">
        <article class="testimonial">A</article>
        <article class="testimonial">B</article>
        <article class="testimonial">C</article>
      </div>
    `;

    const state = { carouselIndex: 0, carouselTotal: 0 };
    initCarouselController({ state });

    const container = document.querySelector<HTMLElement>('.testimonials-grid');
    const slides = Array.from(document.querySelectorAll<HTMLElement>('.testimonial'));
    const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('.carousel-dot'));
    expect(container).not.toBeNull();
    expect(dots).toHaveLength(3);
    expect(state.carouselTotal).toBe(3);
    expect(state.carouselIndex).toBe(0);
    expect(slides[0]?.style.display).toBe('block');
    expect(slides[1]?.style.display).toBe('none');

    dots[1]?.click();
    expect(state.carouselIndex).toBe(1);
    expect(slides[1]?.style.display).toBe('block');

    dispatchTouch(container!, 'touchstart', 220);
    dispatchTouch(container!, 'touchend', 120);
    expect(state.carouselIndex).toBe(2);

    dispatchTouch(container!, 'touchstart', 120);
    dispatchTouch(container!, 'touchend', 230);
    expect(state.carouselIndex).toBe(1);
  });

  it('no-ops on desktop widths', () => {
    setViewportWidth(1024);
    document.body.innerHTML = `
      <div class="testimonials-grid">
        <article class="testimonial">A</article>
      </div>
    `;

    const state = { carouselIndex: 5, carouselTotal: 5 };
    initCarouselController({ state });

    expect(document.querySelector('.carousel-dots')).toBeNull();
    expect(state.carouselIndex).toBe(5);
    expect(state.carouselTotal).toBe(5);
  });
});
