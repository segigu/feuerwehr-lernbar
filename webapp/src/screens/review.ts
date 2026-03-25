import { navigate } from '../app';
import { calculateResults, getSession } from '../state/quiz-state';
import { showBackButton, showMainButton } from '../utils/telegram';
import { h, createImg } from '../utils/dom';

type Filter = 'all' | 'correct' | 'incorrect';

export function renderReview(container: HTMLElement): () => void {
  const results = calculateResults();
  if (!results) {
    navigate('home');
    return () => {};
  }

  const session = getSession();

  function closeReview(): void {
    if (session?.mode === 'topic') {
      navigate('topic-select');
    } else {
      navigate('home');
    }
  }

  let currentFilter: Filter = 'all';

  // Header with title and close button
  const header = h('div', { className: 'review-header' });
  const title = h('h1', { className: 'screen-title' }, 'Antworten');
  const closeBtn = h('button', { className: 'quiz-close-btn' }, '\u2715');
  closeBtn.addEventListener('click', closeReview);
  header.append(title, closeBtn);

  // Filter buttons
  const filters = h('div', { className: 'review-filters' });
  const filterAll = h('button', { className: 'filter-btn active' }, `Alle (${results.total})`);
  const filterCorrect = h('button', { className: 'filter-btn' }, `Richtig (${results.correct})`);
  const filterIncorrect = h('button', { className: 'filter-btn' }, `Falsch (${results.incorrect + results.unanswered})`);

  filterAll.addEventListener('click', () => setFilter('all'));
  filterCorrect.addEventListener('click', () => setFilter('correct'));
  filterIncorrect.addEventListener('click', () => setFilter('incorrect'));

  filters.append(filterAll, filterCorrect, filterIncorrect);

  const listContainer = h('div', { className: 'review-list' });

  container.append(header, filters, listContainer);

  function setFilter(filter: Filter): void {
    currentFilter = filter;
    filterAll.classList.toggle('active', filter === 'all');
    filterCorrect.classList.toggle('active', filter === 'correct');
    filterIncorrect.classList.toggle('active', filter === 'incorrect');
    renderList();
  }

  function renderList(): void {
    listContainer.innerHTML = '';

    const filtered = results!.details.filter(d => {
      if (currentFilter === 'correct') return d.isCorrect;
      if (currentFilter === 'incorrect') return !d.isCorrect;
      return true;
    });

    for (const detail of filtered) {
      const item = h('div', { className: `review-item ${detail.isCorrect ? 'correct' : 'incorrect'}` });

      const header = h('div', { className: 'review-item-header' });
      const statusIcon = h('span', { className: 'review-status' }, detail.isCorrect ? '\u2713' : '\u2717');
      const qNumber = h('span', { className: 'review-qnumber' }, `Frage ${detail.question.id}`);
      const chevron = h('span', { className: 'review-chevron' }, '\u25BE');
      header.append(statusIcon, qNumber, chevron);

      const body = h('div', { className: 'review-item-body' });

      const qText = h('p', { className: 'review-question-text' }, detail.question.question);
      body.appendChild(qText);

      if (detail.question.image) {
        const img = createImg({
          className: 'review-image',
          src: `${import.meta.env.BASE_URL}images/${detail.question.image}`,
          alt: 'Gefahrzeichen',
        });
        body.appendChild(img);
      }

      const keys: Array<'a' | 'b' | 'c'> = ['a', 'b', 'c'];
      for (const key of keys) {
        const optText = detail.question.options[key];
        const isCorrectAnswer = key === detail.correct;
        const isUserAnswer = key === detail.selected;

        let cls = 'review-option';
        if (isCorrectAnswer) cls += ' correct-answer';
        if (isUserAnswer && !isCorrectAnswer) cls += ' wrong-answer';

        const letter = h('span', { className: 'review-option-letter' }, key.toUpperCase());
        const text = h('span', null, optText);
        const opt = h('div', { className: cls }, letter, text);

        if (isCorrectAnswer) {
          opt.appendChild(h('span', { className: 'review-option-icon' }, '\u2713'));
        } else if (isUserAnswer) {
          opt.appendChild(h('span', { className: 'review-option-icon' }, '\u2717'));
        }

        body.appendChild(opt);
      }

      // Toggle expand
      let expanded = false;
      header.addEventListener('click', () => {
        expanded = !expanded;
        body.classList.toggle('expanded', expanded);
        chevron.classList.toggle('rotated', expanded);
      });

      item.append(header, body);
      listContainer.appendChild(item);
    }
  }

  renderList();

  const cleanupBack = showBackButton(() => navigate('results'));
  const cleanupMain = showMainButton('Fertig', () => navigate('home'));

  return () => {
    cleanupBack();
    cleanupMain();
  };
}
