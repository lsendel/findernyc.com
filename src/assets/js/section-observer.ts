type SectionViewEventPayload = {
  event_name: 'section_view';
  properties: {
    section_name: string;
  } & Record<string, unknown>;
  session_id?: string;
};

type InitSectionObserverOptions = {
  trackEvent: (payload: SectionViewEventPayload) => Promise<void> | void;
  sectionsViewed: Set<string>;
};

export function initSectionObserverController(options: InitSectionObserverOptions): void {
  if (!window.IntersectionObserver) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sectionName = entry.target.getAttribute('data-section');
        if (!sectionName) return;
        if (options.sectionsViewed.has(sectionName)) return;
        options.sectionsViewed.add(sectionName);
        void options.trackEvent({
          event_name: 'section_view',
          properties: { section_name: sectionName },
        });
      });
    },
    { threshold: 0.5 },
  );

  document.querySelectorAll<HTMLElement>('section[data-section]').forEach((section) => {
    observer.observe(section);
  });
}
