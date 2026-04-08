/**
 * main.ts — Client-side JS for FinderNYC
 * Compiled by esbuild: src/assets/js/main.ts → src/assets/js/main.js
 *
 * Modules: session, search suggest, star ratings, tip form, newsletter
 */
;(function () {
  /* ------------------------------------------------------------------ */
  /* 1. Session helper                                                   */
  /* ------------------------------------------------------------------ */
  function getSessionId(): string {
    const KEY = 'fnc_sid';
    let sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(KEY, sid);
    }
    return sid;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Search suggest                                                   */
  /* ------------------------------------------------------------------ */
  function initSearchSuggest(inputId: string, dropdownId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function hideDropdown() {
      if (dropdown) dropdown.style.display = 'none';
    }

    function showDropdown() {
      if (dropdown) dropdown.style.display = 'block';
    }

    function clearDropdown() {
      while (dropdown && dropdown.firstChild) {
        dropdown.removeChild(dropdown.firstChild);
      }
    }

    // Build a section (spots / guides / neighborhoods)
    function buildSection(
      label: string,
      items: any[],
      renderItem: (item: any) => HTMLAnchorElement,
    ): HTMLDivElement | null {
      if (!items || items.length === 0) return null;
      const section = document.createElement('div');
      section.className = 'suggest-section';

      const lbl = document.createElement('span');
      lbl.className = 'suggest-label';
      lbl.textContent = label;
      section.appendChild(lbl);

      for (const item of items) {
        section.appendChild(renderItem(item));
      }
      return section;
    }

    function renderSpot(s: { name: string; slug: string; neighborhood?: string; category?: string }): HTMLAnchorElement {
      const a = document.createElement('a');
      a.className = 'suggest-item';
      a.href = `/spots/${s.slug}`;

      const bold = document.createElement('b');
      bold.textContent = s.name;
      a.appendChild(bold);

      if (s.neighborhood || s.category) {
        const span = document.createElement('span');
        span.textContent = [s.neighborhood, s.category].filter(Boolean).join(' \u00B7 ');
        a.appendChild(span);
      }
      return a;
    }

    function renderGuide(g: { title: string; slug: string }): HTMLAnchorElement {
      const a = document.createElement('a');
      a.className = 'suggest-item';
      a.href = `/guides/${g.slug}`;

      const bold = document.createElement('b');
      bold.textContent = g.title;
      a.appendChild(bold);
      return a;
    }

    function renderNeighborhood(n: { name: string; slug: string; borough?: string }): HTMLAnchorElement {
      const a = document.createElement('a');
      a.className = 'suggest-item';
      a.href = `/search?neighborhood=${encodeURIComponent(n.name)}`;

      const bold = document.createElement('b');
      bold.textContent = n.name;
      a.appendChild(bold);

      if (n.borough) {
        const span = document.createElement('span');
        span.textContent = n.borough;
        a.appendChild(span);
      }
      return a;
    }

    input.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) {
        hideDropdown();
        return;
      }
      timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
          if (!res.ok) { hideDropdown(); return; }
          const data = await res.json();

          // Clear previous results
          clearDropdown();

          let hasItems = false;

          const spots = buildSection('Spots', data.spots, renderSpot);
          if (spots) { dropdown!.appendChild(spots); hasItems = true; }

          const guides = buildSection('Guides', data.guides, renderGuide);
          if (guides) { dropdown!.appendChild(guides); hasItems = true; }

          const hoods = buildSection('Neighborhoods', data.neighborhoods, renderNeighborhood);
          if (hoods) { dropdown!.appendChild(hoods); hasItems = true; }

          hasItems ? showDropdown() : hideDropdown();
        } catch {
          hideDropdown();
        }
      }, 300);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown!.contains(e.target as Node) && e.target !== input) {
        hideDropdown();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideDropdown();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Star ratings                                                     */
  /* ------------------------------------------------------------------ */
  function initRatings(): void {
    const section = document.querySelector('.spot-rating') as HTMLElement | null;
    if (!section) return;

    const tipForm = document.getElementById('tip-form');
    const spotId = tipForm?.getAttribute('data-spot-id');
    if (!spotId) return;

    const stars = section.querySelectorAll<HTMLButtonElement>('.star');
    const sid = getSessionId();

    stars.forEach((star) => {
      star.addEventListener('click', async () => {
        const score = Number(star.dataset.score ?? star.dataset.value ?? 0);
        if (!score) return;

        try {
          const res = await fetch('/api/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spot_id: spotId, score, session_id: sid }),
          });

          if (res.ok) {
            // Update star fill classes
            stars.forEach((s) => {
              const sScore = Number(s.dataset.score ?? s.dataset.value ?? 0);
              s.classList.toggle('filled', sScore <= score);
              s.classList.toggle('empty', sScore > score);
            });

            // Update rating text if present
            const ratingText = section.querySelector('.rating-text, .rating-value');
            if (ratingText) {
              ratingText.textContent = `You rated: ${score}/5`;
            }
          }
        } catch {
          // silently fail
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Tip form                                                         */
  /* ------------------------------------------------------------------ */
  function initTipForm(): void {
    const form = document.getElementById('tip-form') as HTMLFormElement | null;
    if (!form) return;

    const spotId = form.getAttribute('data-spot-id');
    if (!spotId) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('tip-status');
      const fd = new FormData(form);
      const text = (fd.get('text') as string || '').trim();

      if (text.length < 10) {
        if (status) {
          status.textContent = 'Tip must be at least 10 characters.';
          status.className = 'error';
        }
        return;
      }

      try {
        const res = await fetch('/api/tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spot_id: spotId,
            text,
            author_name: (fd.get('author_name') as string || '').trim() || undefined,
            author_area: (fd.get('author_area') as string || '').trim() || undefined,
          }),
        });

        if (status) {
          if (res.ok) {
            status.textContent = 'Thanks for the tip!';
            status.className = 'success';
            form.reset();
          } else {
            status.textContent = 'Something went wrong. Try again.';
            status.className = 'error';
          }
        }
      } catch {
        if (status) {
          status.textContent = 'Network error. Try again.';
          status.className = 'error';
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Newsletter                                                       */
  /* ------------------------------------------------------------------ */
  function initNewsletter(): void {
    const form = document.getElementById('newsletter-form') as HTMLFormElement | null;
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('newsletter-status');
      const fd = new FormData(form);
      const email = (fd.get('email') as string || '').trim();

      if (!email) return;

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (status) {
          if (res.ok) {
            status.textContent = "You're signed up!";
            status.className = 'success';
            form.reset();
          } else {
            status.textContent = 'Could not subscribe. Try again.';
            status.className = 'error';
          }
        }
      } catch {
        if (status) {
          status.textContent = 'Network error. Try again.';
          status.className = 'error';
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initSearchSuggest('hero-search-input', 'hero-suggest-dropdown');
    initSearchSuggest('search-input', 'suggest-dropdown');
    initRatings();
    initTipForm();
    initNewsletter();
  });
})();
