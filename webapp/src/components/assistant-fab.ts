import { h } from '../utils/dom';

const SPARKLE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>`;

export function createAssistantFab(onClick: () => void): HTMLElement {
  const row = h('div', { className: 'assistant-fab-row' });

  const btn = h('button', { className: 'assistant-fab' });
  btn.innerHTML = SPARKLE_SVG;
  btn.appendChild(document.createTextNode(' KI-Assistent'));
  btn.addEventListener('click', onClick);

  row.appendChild(btn);
  return row;
}
