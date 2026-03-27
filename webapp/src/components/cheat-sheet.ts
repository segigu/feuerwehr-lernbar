import { h } from '../utils/dom';
import { questions } from '../data/questions';
import type { Question } from '../data/questions';

export function showCheatSheet(): void {
  if (document.querySelector('.cheat-sheet')) return;

  const backdrop = h('div', { className: 'cheat-backdrop' });
  const sheet = h('div', { className: 'cheat-sheet' });

  // Close button (top-right)
  const closeBtn = h('button', { className: 'cheat-sheet-close' }, '\u2715');

  // Results (scrollable middle)
  const results = h('div', { className: 'cheat-sheet-results' });

  // Search bar (pinned bottom, above keyboard)
  const searchBar = h('div', { className: 'cheat-sheet-search-bar' });
  const input = h('input', {
    className: 'cheat-sheet-input',
    type: 'search',
    placeholder: 'Frage suchen...',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
  }) as unknown as HTMLInputElement;
  searchBar.appendChild(input);

  sheet.append(closeBtn, results, searchBar);

  function createCard(q: Question): HTMLElement {
    const card = h('div', { className: 'cheat-card' });
    const topic = h('span', { className: 'cheat-card-topic' }, q.topic);
    const question = h('p', { className: 'cheat-card-question' }, q.question);
    const letter = h('span', { className: 'cheat-card-letter' }, q.correct.toUpperCase());
    const text = h('span', null, q.options[q.correct]);
    const answer = h('div', { className: 'cheat-card-answer' }, letter, text);
    card.append(topic, question, answer);
    return card;
  }

  function renderResults(query: string): void {
    results.innerHTML = '';
    const q = query.trim().toLowerCase();
    const filtered = q
      ? questions.filter(item =>
          item.question.toLowerCase().includes(q) ||
          item.options[item.correct].toLowerCase().includes(q))
      : questions;

    const count = h('div', { className: 'cheat-count' },
      `${filtered.length} von ${questions.length} Fragen`);
    results.appendChild(count);

    if (filtered.length === 0) {
      results.appendChild(h('div', { className: 'cheat-empty' }, 'Keine Fragen gefunden'));
      return;
    }

    for (const item of filtered) {
      results.appendChild(createCard(item));
    }
  }

  // Filter on input
  input.addEventListener('input', () => renderResults(input.value));

  // Dismiss
  function dismiss(): void {
    input.blur();
    backdrop.classList.remove('visible');
    sheet.classList.remove('visible');
    document.body.style.overflow = '';
    cleanupViewport();
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      backdrop.remove();
      sheet.remove();
    }, 300);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') dismiss();
  }

  closeBtn.addEventListener('click', dismiss);
  backdrop.addEventListener('click', dismiss);
  document.addEventListener('keydown', onKey);

  // Track visual viewport for keyboard
  let cleanupViewport = (): void => {};
  const vv = window.visualViewport;
  if (vv) {
    const update = (): void => {
      sheet.style.height = `${vv!.height}px`;
      sheet.style.top = `${vv!.offsetTop}px`;
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    cleanupViewport = () => {
      vv!.removeEventListener('resize', update);
      vv!.removeEventListener('scroll', update);
      sheet.style.height = '';
      sheet.style.top = '';
    };
  }

  // Mount
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  document.body.style.overflow = 'hidden';

  // Show all questions initially
  renderResults('');

  // Animate in + auto-focus
  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
    sheet.classList.add('visible');
    setTimeout(() => input.focus(), 100);
  });
}
