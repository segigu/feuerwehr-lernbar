import { navigate, getNavigationParams } from '../app';
import { getLessonById, extractVocab } from '../data/lessons';
import type { VocabEntry } from '../data/lessons';
import { saveLessonVocabStats } from '../state/lesson-state';
import { showBackButton } from '../utils/telegram';
import { h, clear } from '../utils/dom';

type Direction = 'de-ru' | 'ru-de' | 'mix';

export function renderVocab(container: HTMLElement): () => void {
  const params = getNavigationParams();
  const lesson = params?.lessonId ? getLessonById(params.lessonId) : undefined;

  if (!lesson) {
    navigate('lessons');
    return () => {};
  }

  const backLink = h('button', { className: 'back-link' }, '\u2190 ' + lesson.title);
  backLink.addEventListener('click', () => navigate('lesson-detail', { lessonId: lesson.id }));
  container.appendChild(backLink);

  let direction: Direction = (params?.vocabDirection as Direction) ?? 'de-ru';
  const allVocab = extractVocab(lesson);

  // Shuffle
  const vocab = [...allVocab];
  for (let i = vocab.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vocab[i], vocab[j]] = [vocab[j], vocab[i]];
  }

  let currentIndex = 0;
  let known = 0;
  let unknown = 0;

  // Direction selector
  const dirRow = h('div', { className: 'vocab-dir-row' });
  const dirs: Array<{ label: string; value: Direction }> = [
    { label: 'DE \u2192 RU', value: 'de-ru' },
    { label: 'RU \u2192 DE', value: 'ru-de' },
    { label: 'Mix', value: 'mix' },
  ];

  for (const d of dirs) {
    const btn = h('button', {
      className: `filter-btn${d.value === direction ? ' active' : ''}`,
    }, d.label);
    btn.addEventListener('click', () => {
      direction = d.value;
      currentIndex = 0;
      known = 0;
      unknown = 0;
      // Re-shuffle
      for (let i = vocab.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vocab[i], vocab[j]] = [vocab[j], vocab[i]];
      }
      render();
    });
    dirRow.appendChild(btn);
  }

  // Progress
  const progressEl = h('div', { className: 'vocab-progress' });

  // Card scene
  const cardScene = h('div', { className: 'vocab-card-scene' });

  // Actions
  const actionsEl = h('div', { className: 'vocab-actions' });

  container.append(dirRow, progressEl, cardScene, actionsEl);

  function getPromptAndAnswer(entry: VocabEntry): { prompt: string; answer: string } {
    if (direction === 'de-ru') {
      return { prompt: entry.de, answer: entry.ru };
    } else if (direction === 'ru-de') {
      return { prompt: entry.ru, answer: entry.de };
    } else {
      // Mix: random per card
      return Math.random() < 0.5
        ? { prompt: entry.de, answer: entry.ru }
        : { prompt: entry.ru, answer: entry.de };
    }
  }

  function render(): void {
    // Update direction buttons
    dirRow.querySelectorAll('.filter-btn').forEach((btn, i) => {
      btn.classList.toggle('active', dirs[i].value === direction);
    });

    // Update progress
    const remaining = vocab.length - currentIndex;
    progressEl.textContent = `${currentIndex + 1} / ${vocab.length} \u00B7 \u2713 ${known} \u00B7 \u2717 ${unknown} \u00B7 \u00FCbrig ${remaining}`;

    // Render card
    clear(cardScene);
    clear(actionsEl);

    if (currentIndex >= vocab.length) {
      renderDone();
      return;
    }

    const entry = vocab[currentIndex];
    const { prompt, answer } = getPromptAndAnswer(entry);

    const card = h('div', { className: 'vocab-card' });
    const front = h('div', { className: 'vocab-card-front' });
    const frontText = h('div', { className: 'vocab-card-text' }, prompt);
    const hintBtn = h('button', { className: 'vocab-hint-btn' }, 'Hinweis');
    hintBtn.addEventListener('click', () => {
      hintBtn.textContent = answer.substring(0, 3) + '...';
      hintBtn.disabled = true;
    });
    front.append(frontText, hintBtn);

    const back = h('div', { className: 'vocab-card-back' });
    const backText = h('div', { className: 'vocab-card-text' }, answer);
    back.appendChild(backText);

    card.append(front, back);
    cardScene.appendChild(card);

    // Flip button
    const flipBtn = h('button', { className: 'action-btn action-primary' }, 'Umdrehen');
    flipBtn.addEventListener('click', () => {

      card.classList.add('flipped');
      renderActions();
    });
    actionsEl.appendChild(flipBtn);
  }

  function renderActions(): void {
    clear(actionsEl);

    const knownBtn = h('button', { className: 'action-btn vocab-btn-known' }, 'Wusste ich \u2713');
    knownBtn.addEventListener('click', () => {
      known++;
      currentIndex++;
      render();
    });

    const unknownBtn = h('button', { className: 'action-btn vocab-btn-unknown' }, 'Wusste nicht \u2717');
    unknownBtn.addEventListener('click', () => {
      unknown++;
      currentIndex++;
      render();
    });

    const skipBtn = h('button', { className: 'action-btn action-secondary' }, 'Weiter \u2192');
    skipBtn.addEventListener('click', () => {
      currentIndex++;
      render();
    });

    actionsEl.append(knownBtn, unknownBtn, skipBtn);
  }

  function renderDone(): void {
    clear(cardScene);
    clear(actionsEl);

    saveLessonVocabStats(lesson!.id, { known, unknown });

    progressEl.textContent = `Fertig! \u2713 ${known} \u00B7 \u2717 ${unknown}`;

    const doneCard = h('div', { className: 'vocab-done' });
    doneCard.append(
      h('div', { className: 'vocab-done-title' }, 'Alle Vokabeln durch!'),
      h('div', { className: 'vocab-done-stats' }, `${known} gewusst, ${unknown} nicht gewusst`)
    );
    cardScene.appendChild(doneCard);

    const againBtn = h('button', { className: 'action-btn action-primary' }, 'Nochmal');
    againBtn.addEventListener('click', () => {
      currentIndex = 0;
      known = 0;
      unknown = 0;
      for (let i = vocab.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vocab[i], vocab[j]] = [vocab[j], vocab[i]];
      }
      render();
    });

    const backBtn = h('button', { className: 'action-btn action-secondary' }, 'Fertig');
    backBtn.addEventListener('click', () => {
      navigate('lesson-detail', { lessonId: lesson!.id });
    });

    actionsEl.append(againBtn, backBtn);
  }

  render();

  const cleanupBack = showBackButton(() => navigate('lesson-detail', { lessonId: lesson!.id }));
  return () => { cleanupBack(); };
}
