import { navigate } from '../app';
import { questions } from '../data/questions';
import { createSession, loadSavedProgress, clearSavedProgress, restoreSession, loadWrongIds, clearWrongIds } from '../state/quiz-state';
import { getRandomExamQuestions } from '../data/questions';
import { getLanguage } from '../state/app-state';
import { h, createImg } from '../utils/dom';
import { showInstallBanner } from '../components/install-banner';

const BASE = import.meta.env.BASE_URL;

function setupSirenGesture(iconWrap: HTMLElement, screenEl: HTMLElement): () => void {
  const THRESHOLD = 120;
  const MAX_PULL = 180;
  const SCALE_AT_THRESHOLD = 1.6;
  const SIREN_DURATION = 3500;
  const SNAP_MS = 350;

  let startX = 0;
  let startY = 0;
  let pulling = false;
  let sirenActive = false;
  let sirenTimer: number | null = null;
  let snapTimer: number | null = null;
  let thresholdReached = false;

  function clearVisuals() {
    iconWrap.classList.remove('home-icon-snap-back', 'home-icon-siren');
    iconWrap.style.transform = '';
    screenEl.classList.remove('home-icon-snap-back');
    screenEl.style.transform = '';
  }

  function onTouchStart(e: TouchEvent) {
    if (sirenActive) return;

    // Clean up any leftover snap-back animation
    if (snapTimer) { clearTimeout(snapTimer); snapTimer = null; clearVisuals(); }

    if (document.documentElement.scrollTop > 5 && document.body.scrollTop > 5) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    pulling = false;
    thresholdReached = false;
  }

  function onTouchMove(e: TouchEvent) {
    if (startY === 0 || sirenActive) return;

    const dy = e.touches[0].clientY - startY;
    const adx = Math.abs(e.touches[0].clientX - startX);

    if (!pulling) {
      if (dy < 8 && adx < 8) return;
      if (adx > dy || dy <= 0) { startY = 0; return; }
      pulling = true;
    }

    e.preventDefault();

    const clamped = Math.min(Math.max(dy, 0), MAX_PULL);
    const progress = Math.min(clamped / THRESHOLD, 1);
    const overProgress = clamped > THRESHOLD
      ? (clamped - THRESHOLD) / (MAX_PULL - THRESHOLD)
      : 0;
    const scale = 1 + (SCALE_AT_THRESHOLD - 1) * progress + 0.1 * overProgress;
    iconWrap.style.transform = `scale(${scale})`;
    screenEl.style.transform = `translateY(${clamped * 0.4}px)`;

    if (progress >= 1 && !thresholdReached) {
      thresholdReached = true;
      iconWrap.classList.add('home-icon-siren');
      if (navigator.vibrate) navigator.vibrate(20);
    } else if (progress < 1 && thresholdReached) {
      thresholdReached = false;
      iconWrap.classList.remove('home-icon-siren');
    }
  }

  function onTouchEnd() {
    if (!pulling) { startY = 0; return; }
    pulling = false;
    startY = 0;

    // Animate snap-back
    iconWrap.classList.add('home-icon-snap-back');
    iconWrap.style.transform = 'scale(1)';
    screenEl.classList.add('home-icon-snap-back');
    screenEl.style.transform = '';

    if (thresholdReached) {
      thresholdReached = false;
      sirenActive = true;
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      sirenTimer = window.setTimeout(() => {
        sirenActive = false;
        sirenTimer = null;
        clearVisuals();
      }, SIREN_DURATION);
    } else {
      snapTimer = window.setTimeout(() => {
        snapTimer = null;
        clearVisuals();
      }, SNAP_MS);
    }
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    if (sirenTimer) clearTimeout(sirenTimer);
    if (snapTimer) clearTimeout(snapTimer);
    clearVisuals();
  };
}

export function renderHome(container: HTMLElement): () => void {
  const header = h('div', { className: 'home-header' });

  const iconWrap = h('div', { className: 'home-icon-wrap' });
  const icon = createImg({ className: 'home-icon', src: `${BASE}images/Fahrzeugkunde.png`, alt: '' });
  const flashRed = h('span', { className: 'home-icon-flash' });
  iconWrap.append(icon, flashRed);
  const title = h('h1', { className: 'home-title' }, 'MTA Prüfungstrainer');

  header.append(iconWrap, title);
  container.appendChild(header);

  // Pull-down siren gesture
  const cleanupSiren = setupSirenGesture(iconWrap, container);

  // PWA install banner (mobile browsers only)
  const cleanupBanner = showInstallBanner();

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

  // Card: All questions — check for saved progress or wrong IDs
  const saved = loadSavedProgress();
  const wrongIds = saved ? [] : loadWrongIds();
  let cardAll: HTMLElement;

  if (saved) {
    // State 1: In-progress session — resume / restart
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
  } else if (wrongIds.length > 0) {
    // State 2: Completed with errors — retry wrong / start fresh
    const cardEl = h('div', { className: 'home-card-wrap' });

    const retryCard = createCard(
      `${BASE}images/Alle Fragen.png`,
      'Alle Fragen',
      `${wrongIds.length} Fehler zum Wiederholen`,
      'Falsche Fragen nochmal üben',
      () => {
        const qMap = new Map(questions.map(q => [q.id, q]));
        const retryQuestions = wrongIds
          .map(id => qMap.get(id))
          .filter((q): q is NonNullable<typeof q> => q !== undefined);
        for (let i = retryQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [retryQuestions[i], retryQuestions[j]] = [retryQuestions[j], retryQuestions[i]];
        }
        createSession('all', retryQuestions);
        navigate('quiz');
      }
    );

    const resetBtn = h('button', { className: 'home-card-reset' }, 'Neu starten');
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearWrongIds();
      createSession('all', getRandomExamQuestions(questions.length));
      navigate('quiz');
    });

    cardEl.append(retryCard, resetBtn);
    cardAll = cardEl;
  } else {
    // State 3: No state — fresh start
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

  return () => { cleanupBanner(); cleanupSiren(); };
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

