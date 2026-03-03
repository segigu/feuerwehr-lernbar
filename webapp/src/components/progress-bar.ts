import { h } from '../utils/dom';

export function createProgressBar(current: number, total: number): HTMLElement {
  const pct = Math.round((current / total) * 100);

  const fill = h('div', { className: 'progress-fill' });
  fill.style.width = `${pct}%`;

  const bar = h('div', { className: 'progress-bar' }, fill);

  const label = h('div', { className: 'progress-label' },
    `Frage ${current} von ${total}`
  );

  return h('div', { className: 'progress-container' }, label, bar);
}
