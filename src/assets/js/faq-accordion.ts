type FaqExpandEventPayload = {
  event_name: 'faq_expand';
  properties: {
    question_index: number;
  } & Record<string, unknown>;
  session_id?: string;
};

type InitFaqAccordionOptions = {
  trackEvent: (payload: FaqExpandEventPayload) => Promise<void> | void;
  setOpenFaqIndex: (index: number | null) => void;
  getOpenFaqIndex: () => number | null;
};

export function initFaqAccordionController(options: InitFaqAccordionOptions): void {
  const faqItems = Array.from(document.querySelectorAll<HTMLDetailsElement>('.faq-item'));

  faqItems.forEach((details, index) => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        faqItems.forEach((other, otherIndex) => {
          if (otherIndex !== index && other.open) {
            other.open = false;
          }
        });
        void options.trackEvent({
          event_name: 'faq_expand',
          properties: { question_index: index },
        });
        options.setOpenFaqIndex(index);
      } else if (options.getOpenFaqIndex() === index) {
        options.setOpenFaqIndex(null);
      }
    });
  });
}
