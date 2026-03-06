import { afterEach, describe, expect, it } from 'vitest';
import { initMobileNavController } from '../../src/assets/js/mobile-nav';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mobile nav controller', () => {
  it('opens and closes drawer via hamburger and overlay controls', () => {
    document.body.innerHTML = `
      <button id="hamburger-btn" aria-expanded="false" type="button">Menu</button>
      <div id="drawer-overlay"></div>
      <aside id="mobile-drawer" hidden>
        <a href="#about">About</a>
        <button id="drawer-close-btn" type="button">Close</button>
      </aside>
    `;

    const state = { navOpen: false };
    initMobileNavController({
      isNavOpen: () => state.navOpen,
      setNavOpen: (open) => {
        state.navOpen = open;
      },
    });

    const hamburger = document.getElementById('hamburger-btn') as HTMLButtonElement;
    const overlay = document.getElementById('drawer-overlay') as HTMLElement;
    const drawer = document.getElementById('mobile-drawer') as HTMLElement;

    hamburger.click();
    expect(state.navOpen).toBe(true);
    expect(drawer.hasAttribute('hidden')).toBe(false);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');

    overlay.click();
    expect(state.navOpen).toBe(false);
    expect(drawer.hasAttribute('hidden')).toBe(true);
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('supports escape close, link close, and focus trap cycling', () => {
    document.body.innerHTML = `
      <button id="hamburger-btn" aria-expanded="false" type="button">Menu</button>
      <div id="drawer-overlay"></div>
      <aside id="mobile-drawer" hidden>
        <a id="drawer-link" href="#about">About</a>
        <button id="drawer-close-btn" type="button">Close</button>
      </aside>
    `;

    const state = { navOpen: false };
    initMobileNavController({
      isNavOpen: () => state.navOpen,
      setNavOpen: (open) => {
        state.navOpen = open;
      },
    });

    const hamburger = document.getElementById('hamburger-btn') as HTMLButtonElement;
    const drawer = document.getElementById('mobile-drawer') as HTMLElement;
    const link = document.getElementById('drawer-link') as HTMLAnchorElement;
    const closeBtn = document.getElementById('drawer-close-btn') as HTMLButtonElement;

    hamburger.click();
    closeBtn.focus();
    drawer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(link);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(state.navOpen).toBe(false);
    expect(drawer.hasAttribute('hidden')).toBe(true);

    hamburger.click();
    link.click();
    expect(state.navOpen).toBe(false);
    expect(drawer.hasAttribute('hidden')).toBe(true);
  });
});
