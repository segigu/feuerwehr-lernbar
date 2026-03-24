import { navigate } from '../app';
import { questions } from '../data/questions';
import { createSession, loadSavedProgress, clearSavedProgress, restoreSession } from '../state/quiz-state';
import { getRandomExamQuestions } from '../data/questions';
import { getLanguage } from '../state/app-state';
import { h, createImg } from '../utils/dom';
import { createInstallBanner } from '../components/install-banner';

const BASE = import.meta.env.BASE_URL;

export function renderHome(container: HTMLElement): () => void {
  const header = h('div', { className: 'home-header' });

  const iconWrap = h('div', { className: 'home-icon-wrap home-icon-animated' });
  const icon = createImg({ className: 'home-icon', src: `${BASE}images/Fahrzeugkunde.png`, alt: '' });
  const flashRed = h('span', { className: 'home-icon-flash' });
  iconWrap.append(icon, flashRed);
  const title = h('h1', { className: 'home-title' }, 'MTA Prüfungstrainer');

  header.append(iconWrap, title);
  container.appendChild(header);

  // PWA install banner (mobile browsers only)
  const installBanner = createInstallBanner();
  if (installBanner) container.appendChild(installBanner);

  // ── Section 1: Unterricht ──────────────────────────────────
  container.appendChild(sectionLabel('Unterricht'));

  const cardsUnterricht = h('div', { className: 'home-cards' });

  const lang = getLanguage();
  const unterrichtBadge = lang === 'de+ru'
    ? '12 Themen \u00B7 Lernen \u00B7 Quiz \u00B7 Vokabeln'
    : '12 Themen \u00B7 Lernen \u00B7 Quiz';
  const cardUnterricht = createCard(
    `${BASE}images/Unterricht.png`,
    'Unterricht',
    unterrichtBadge,
    'Unterrichtsmaterial durcharbeiten',
    () => { navigate('lessons'); }
  );

  cardsUnterricht.appendChild(cardUnterricht);
  container.appendChild(cardsUnterricht);

  // ── Section 2: Fragen & Prüfung ───────────────────────────
  container.appendChild(sectionLabel('Fragen & Prüfung'));

  const cardsFragen = h('div', { className: 'home-cards' });

  // Card: By topic
  const cardTopic = createCard(
    `${BASE}images/Nach Thema.png`,
    'Nach Thema',
    '12 Themengebiete',
    'Gezielt einzelne Themen üben',
    () => { navigate('topic-select'); }
  );

  // Card: All questions — check for saved progress
  const saved = loadSavedProgress();
  let cardAll: HTMLElement;

  if (saved) {
    const answered = Object.keys(saved.answers).length;
    const cardEl = h('div', { className: 'home-card-wrap' });

    const resumeBtn = createCard(
      `${BASE}images/Alle Fragen.png`,
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
      `${BASE}images/Alle Fragen.png`,
      'Alle Fragen',
      '214 Fragen in zufälliger Reihenfolge',
      'Alle Fragen durchgehen',
      () => {
        createSession('all', getRandomExamQuestions(questions.length));
        navigate('quiz');
      }
    );
  }

  // Card: Exam simulation
  const cardExam = createCard(
    `${BASE}images/Prüfung.png`,
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

  cardsFragen.append(cardTopic, cardAll, cardExam);
  container.appendChild(cardsFragen);

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

function sectionLabel(text: string): HTMLElement {
  return h('p', { className: 'home-section-label' }, text);
}

function createCard(imgSrc: string, title: string, badge: string, description: string, onClick: () => void): HTMLElement {
  const card = h('button', { className: 'home-card' });

  const imgEl = createImg({ className: 'home-card-img', src: imgSrc, alt: '' });

  const textCol = h('div', { className: 'home-card-text' });
  const cardTitle = h('h2', { className: 'home-card-title' }, title);
  const cardBadge = h('span', { className: 'home-card-badge' }, badge);
  const cardDesc = h('p', { className: 'home-card-desc' }, description);
  textCol.append(cardTitle, cardBadge, cardDesc);

  card.append(imgEl, textCol);
  card.addEventListener('click', onClick);

  return card;
}

