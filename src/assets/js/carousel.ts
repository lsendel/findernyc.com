type CarouselState = {
  carouselIndex: number;
  carouselTotal: number;
};

type InitCarouselOptions = {
  state: CarouselState;
};

function renderCarousel(
  slides: HTMLElement[],
  dots: HTMLButtonElement[],
  state: CarouselState,
): void {
  slides.forEach((slide, index) => {
    slide.style.display = index === state.carouselIndex ? 'block' : 'none';
  });
  dots.forEach((dot, index) => {
    dot.classList.toggle('is-active', index === state.carouselIndex);
  });
}

export function initCarouselController(options: InitCarouselOptions): void {
  if (window.innerWidth >= 768) return;

  const container = document.querySelector<HTMLElement>('.testimonials-grid');
  if (!container) return;

  const slides = Array.from(container.querySelectorAll<HTMLElement>('.testimonial'));
  if (slides.length === 0) return;

  options.state.carouselTotal = slides.length;
  options.state.carouselIndex = 0;

  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-dots';

  const dots = slides.map((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot tap-target';
    dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
    dot.addEventListener('click', () => {
      options.state.carouselIndex = index;
      renderCarousel(slides, dots, options.state);
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  container.insertAdjacentElement('afterend', dotsContainer);
  renderCarousel(slides, dots, options.state);

  let touchStartX = 0;
  let touchEndX = 0;

  container.addEventListener('touchstart', (event: TouchEvent) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  container.addEventListener('touchend', (event: TouchEvent) => {
    touchEndX = event.changedTouches[0].clientX;
    const delta = touchEndX - touchStartX;

    if (delta < -50) {
      options.state.carouselIndex = (options.state.carouselIndex + 1) % options.state.carouselTotal;
      renderCarousel(slides, dots, options.state);
    } else if (delta > 50) {
      options.state.carouselIndex =
        (options.state.carouselIndex - 1 + options.state.carouselTotal) % options.state.carouselTotal;
      renderCarousel(slides, dots, options.state);
    }
  }, { passive: true });
}
