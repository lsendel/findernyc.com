export type UiStatusState = 'idle' | 'loading' | 'success' | 'warning' | 'error';

const STATUS_CLASS_PREFIX = 'ui-status-';

function clearStatusClasses(element: HTMLElement): void {
  const classesToRemove: string[] = [];
  for (const className of element.classList) {
    if (className.startsWith(STATUS_CLASS_PREFIX)) {
      classesToRemove.push(className);
    }
  }
  if (classesToRemove.length > 0) {
    element.classList.remove(...classesToRemove);
  }
}

export function setStatusState(
  element: HTMLElement | null,
  message: string,
  state: UiStatusState = 'idle',
): void {
  if (!element) return;
  element.textContent = message;
  element.classList.add('ui-status');
  clearStatusClasses(element);
  element.classList.add(`${STATUS_CLASS_PREFIX}${state}`);
  element.setAttribute('data-ui-state', state);
}

export function renderListState(
  container: HTMLElement,
  message: string,
  state: UiStatusState = 'idle',
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const item = document.createElement('li');
  item.className = `saved-search-item ui-list-state ui-list-state-${state}`;
  item.textContent = message;
  container.appendChild(item);
}

