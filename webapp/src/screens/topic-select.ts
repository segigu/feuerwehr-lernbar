import { navigate } from '../app';
import { topics, getQuestionsByTopic } from '../data/questions';
import { createSession } from '../state/quiz-state';
import { showBackButton } from '../utils/telegram';
import { h, createImg } from '../utils/dom';

const BASE = import.meta.env.BASE_URL;

const topicImages: Record<string, string> = {
  'Rechtsgrundlagen und Organisation': 'Rechtsgrundlagen.png',
  'Brennen und Löschen': 'Brennen und Löschen.png',
  'Fahrzeugkunde': 'Fahrzeugkunde.png',
  'Persönliche Ausrüstung und Löschgeräte': 'Persönliche Ausrüstung.png',
  'Geräte und Armaturen': 'Geräte und Armaturen.png',
  'Rettung, Leitern und Knoten': 'Rettung, Leitern und Knoten.png',
  'Erste Hilfe und Einsatzhygiene': 'Erste Hilfe.png',
  'Einsatzgrundsätze und Gefahren': 'Einsatzgrundsätze.png',
  'Löscheinsatz (FwDV 3)': 'Löscheinsatz FwDV3.png',
  'Sichern und Absturzsicherung': 'Absturzsicherung.png',
  'Technische Hilfeleistung und Gefahrgut': 'Technische Hilfeleistung.png',
  'Sprechfunk': 'Sprechfunk.png',
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

    const imgFile = topicImages[topic];
    if (imgFile) {
      const thumb = createImg({ className: 'lesson-thumb', src: `${BASE}images/${imgFile}`, alt: '' });
      card.appendChild(thumb);
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
