import { navigate } from '../app';
import { questions } from '../data/questions';
import { createSession, loadSavedProgress, clearSavedProgress, restoreSession } from '../state/quiz-state';
import { getRandomExamQuestions } from '../data/questions';
import { getLanguage, toggleLanguage } from '../state/app-state';
import { h } from '../utils/dom';

export function renderHome(container: HTMLElement): () => void {
  const header = h('div', { className: 'home-header' });

  const icon = h('img', { className: 'home-icon', src: `${import.meta.env.BASE_URL}images/FWAuto.png`, alt: '' });
  const title = h('h1', { className: 'home-title' }, 'MTA Prüfungstrainer');
  const subtitle = h('p', { className: 'home-subtitle' }, 'Basismodul \u2014 Staatliche Feuerwehrschule Würzburg');
  const info = h('p', { className: 'home-info' }, `214 Fragen \u00B7 12 Themen`);

  // Secret 5-tap language toggle
  let tapCount = 0;
  let tapTimer: ReturnType<typeof setTimeout> | null = null;
  title.addEventListener('click', () => {
    tapCount++;
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 2000);
    if (tapCount >= 5) {
      tapCount = 0;
      const newLang = toggleLanguage();
      showToast(newLang === 'de+ru' ? 'DE + RU aktiviert' : 'Nur Deutsch');
    }
  });

  header.append(icon, title, subtitle, info);
  container.appendChild(header);

  const cards = h('div', { className: 'home-cards' });

  // Card 1: All questions — check for saved progress
  const saved = loadSavedProgress();
  let cardAll: HTMLElement;

  if (saved) {
    const answered = Object.keys(saved.answers).length;
    const cardEl = h('div', { className: 'home-card-wrap' });

    const resumeBtn = createCard(
      'Alle Fragen',
      `Fortsetzen \u2014 ${answered} von ${saved.questionIds.length} beantwortet`,
      'Weiter wo du aufgehört hast',
      () => {
        restoreSession();
        navigate('quiz');
      }
    );

    const resetBtn = h('button', { className: 'home-card-reset' }, 'Neu starten');
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSavedProgress();
      createSession('all', getRandomExamQuestions(questions.length));
      navigate('quiz');
    });

    cardEl.append(resumeBtn, resetBtn);
    cardAll = cardEl;
  } else {
    cardAll = createCard(
      'Alle Fragen',
      '214 Fragen in zufälliger Reihenfolge',
      'Alle Fragen durchgehen',
      () => {
        createSession('all', getRandomExamQuestions(questions.length));
        navigate('quiz');
      }
    );
  }

  // Card 2: Exam simulation
  const cardExam = createCard(
    'Prüfung',
    '50 zufällige Fragen',
    'Simuliere die Zwischenprüfung',
    () => {
      createSession('exam', getRandomExamQuestions(50), {
        timerEnabled: true,
        timerSeconds: 45 * 60,
      });
      navigate('quiz');
    }
  );

  // Card 3: By topic
  const cardTopic = createCard(
    'Nach Thema',
    '12 Themengebiete',
    'Gezielt einzelne Themen üben',
    () => {
      navigate('topic-select');
    }
  );

  // Card 4: Unterricht
  const lang = getLanguage();
  const unterrichtBadge = lang === 'de+ru'
    ? '12 Themen \u00B7 Lernen \u00B7 Quiz \u00B7 Vokabeln'
    : '12 Themen \u00B7 Lernen \u00B7 Quiz';
  const cardUnterricht = createCard(
    'Unterricht',
    unterrichtBadge,
    'Unterrichtsmaterial durcharbeiten',
    () => {
      navigate('lessons');
    }
  );

  cards.append(cardAll, cardExam, cardTopic, cardUnterricht);
  container.appendChild(cards);

  // Source attribution
  const footer = h('div', { className: 'home-footer' });
  const footerLine1 = h('span', {}, 'Quelle: Fragenkatalog Basis 15.2');
  const footerLine2 = h('a', {
    href: 'https://fra-gen.sfs-bayern.de',
    target: '_blank',
    rel: 'noopener',
    className: 'home-footer-link',
  }, 'Staatliche Feuerwehrschule Würzburg');
  const footerLine3 = h('span', {}, 'Kein offizielles Angebot der SFS');
  footer.append(footerLine1, footerLine2, footerLine3);
  container.appendChild(footer);

  return () => {};
}

function createCard(title: string, badge: string, description: string, onClick: () => void): HTMLElement {
  const card = h('button', { className: 'home-card' });

  const cardTitle = h('h2', { className: 'home-card-title' }, title);
  const cardBadge = h('span', { className: 'home-card-badge' }, badge);
  const cardDesc = h('p', { className: 'home-card-desc' }, description);

  card.append(cardTitle, cardBadge, cardDesc);
  card.addEventListener('click', onClick);

  return card;
}

function showToast(message: string): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = h('div', { className: 'toast' }, message);
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
