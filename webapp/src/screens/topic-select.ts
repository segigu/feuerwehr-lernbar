import { navigate } from '../app';
import { topics, getQuestionsByTopic } from '../data/questions';
import { createSession } from '../state/quiz-state';
import { getLessonByTopic } from '../data/lessons';
import { showBackButton } from '../utils/telegram';
import { h } from '../utils/dom';

const BASE = import.meta.env.BASE_URL;

const lessonImages: Record<string, string> = {
  'rechtsgrundlagen': 'Rechtsgrundlagen.png',
  'brennen-loeschen': 'Brennen und L\u00F6schen.png',
  'fahrzeugkunde': 'Fahrzeugkunde.png',
  'persoenliche-ausruestung': 'Pers\u00F6nliche Ausr\u00FCstung.png',
  'schlaeuche-armaturen': 'Ger\u00E4te und Armaturen.png',
  'hilfeleistungsgeraete': 'Technische Hilfeleistung.png',
  'rettungsgeraete': 'Rettung, Leitern und Knoten.png',
  'belastungen': 'Belastungen.png',
  'verhalten-einsatz': 'Verhalten.png',
  'hygiene': 'Erste Hilfe.png',
  'verhalten-gefahr': 'Gefahr.png',
  'loescheinsatz': 'L\u00F6scheinsatz FwDV3.png',
  'absturzsicherung': 'Absturzsicherung.png',
  'hilfeleistungseinsatz': 'Einheiten.png',
  'abc-gefahrstoffe': 'ABC.png',
  'erste-hilfe': 'Erste Hilfe.png',
  'sprechfunk': 'Sprechfunk.png',
};

export function renderTopicSelect(container: HTMLElement): () => void {
  const backLink = h('button', { className: 'back-link' }, '\u2190 Startseite');
  backLink.addEventListener('click', () => navigate('home'));
  container.appendChild(backLink);

  const title = h('h1', { className: 'screen-title' }, 'Thema w\u00E4hlen');
  container.appendChild(title);

  const grid = h('div', { className: 'topic-grid' });

  for (const topic of topics) {
    const topicQuestions = getQuestionsByTopic(topic);
    const count = topicQuestions.length;

    const card = h('button', { className: 'topic-card' });

    // Thumbnail from lesson image
    const lesson = getLessonByTopic(topic);
    if (lesson) {
      const imgFile = lessonImages[lesson.id];
      if (imgFile) {
        const thumb = h('img', { className: 'lesson-thumb', src: `${BASE}images/${imgFile}`, alt: '' });
        card.appendChild(thumb);
      }
    }

    const topicName = h('span', { className: 'topic-name' }, topic);
    const countBadge = h('span', { className: 'topic-count' }, `${count} Fragen`);
    card.append(topicName, countBadge);

    card.addEventListener('click', () => {
      createSession('topic', topicQuestions, { topicName: topic });
      navigate('quiz');
    });

    grid.appendChild(card);
  }

  container.appendChild(grid);

  const cleanupBack = showBackButton(() => navigate('home'));

  return () => {
    cleanupBack();
  };
}
