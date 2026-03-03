import { navigate } from '../app';
import { questions } from '../data/questions';
import { createSession } from '../state/quiz-state';
import { getRandomExamQuestions } from '../data/questions';
import { h } from '../utils/dom';

export function renderHome(container: HTMLElement): () => void {
  const header = h('div', { className: 'home-header' });

  const icon = h('div', { className: 'home-icon' }, '\u{1F692}');
  const title = h('h1', { className: 'home-title' }, 'MTA Prüfungstrainer');
  const subtitle = h('p', { className: 'home-subtitle' }, 'Basismodul \u2014 Staatliche Feuerwehrschule Würzburg');
  const info = h('p', { className: 'home-info' }, `214 Fragen \u00B7 12 Themen`);

  header.append(icon, title, subtitle, info);
  container.appendChild(header);

  const cards = h('div', { className: 'home-cards' });

  // Card 1: All questions (shuffled)
  const cardAll = createCard(
    'Alle Fragen',
    '214 Fragen in zufälliger Reihenfolge',
    'Alle Fragen durchgehen',
    () => {
      createSession('all', getRandomExamQuestions(questions.length));
      navigate('quiz');
    }
  );

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

  cards.append(cardAll, cardExam, cardTopic);
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
