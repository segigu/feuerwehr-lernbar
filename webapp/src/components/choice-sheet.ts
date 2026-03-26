import { h } from '../utils/dom';

export function showChoiceSheet(options: {
  title: string;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
}): void {
  const backdrop = h('div', { className: 'install-backdrop' });
  const sheet = h('div', { className: 'choice-sheet' });

  const handle = h('div', { className: 'install-sheet-handle' });

  const title = h('div', { className: 'choice-sheet-title' }, options.title);

  const actions = h('div', { className: 'choice-sheet-actions' });

  const primaryBtn = h('button', { className: 'action-btn action-primary' }, options.primary.label);
  const secondaryBtn = h('button', { className: 'action-btn action-secondary' }, options.secondary.label);

  actions.append(primaryBtn, secondaryBtn);
  sheet.append(handle, title, actions);

  function dismiss(immediate = false) {
    backdrop.classList.remove('visible');
    sheet.classList.remove('visible');
    document.body.style.overflow = '';
    if (immediate) {
      backdrop.remove();
      sheet.remove();
    } else {
      setTimeout(() => {
        backdrop.remove();
        sheet.remove();
      }, 300);
    }
  }

  primaryBtn.addEventListener('click', () => {
    dismiss(true);
    options.primary.onClick();
  });

  secondaryBtn.addEventListener('click', () => {
    dismiss(true);
    options.secondary.onClick();
  });

  backdrop.addEventListener('click', () => dismiss());

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
    sheet.classList.add('visible');
  });
}
