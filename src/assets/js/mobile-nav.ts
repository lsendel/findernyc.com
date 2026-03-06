type InitMobileNavOptions = {
  isNavOpen: () => boolean;
  setNavOpen: (open: boolean) => void;
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function initMobileNavController(options: InitMobileNavOptions): void {
  const hamburger = document.getElementById('hamburger-btn') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('drawer-close-btn') as HTMLButtonElement | null;
  const drawer = document.getElementById('mobile-drawer') as HTMLElement | null;
  const overlay = document.getElementById('drawer-overlay') as HTMLElement | null;

  if (!hamburger || !closeBtn || !drawer || !overlay) return;

  const openDrawer = (): void => {
    drawer.removeAttribute('hidden');
    hamburger.setAttribute('aria-expanded', 'true');
    options.setNavOpen(true);
    const focusable = getFocusableElements(drawer);
    if (focusable.length > 0) focusable[0].focus();
  };

  const closeDrawer = (): void => {
    drawer.setAttribute('hidden', '');
    hamburger.setAttribute('aria-expanded', 'false');
    options.setNavOpen(false);
    hamburger.focus();
  };

  hamburger.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawer.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && options.isNavOpen()) {
      closeDrawer();
    }
  });

  drawer.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(drawer);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
