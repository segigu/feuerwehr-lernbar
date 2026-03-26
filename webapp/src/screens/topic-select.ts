import { navigate } from '../app';
import { topics, getQuestionsByTopic } from '../data/questions';
import { createSession, loadTopicProgress, restoreTopicSession } from '../state/quiz-state';
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

  // Accumulate totals across all topics
  let totalQuestions = 0, totalAnswered = 0, totalCorrect = 0, totalIncorrect = 0;

  const grid = h('div', { className: 'topic-grid' });

  for (const topic of topics) {
    const topicQuestions = getQuestionsByTopic(topic);
    const count = topicQuestions.length;
    totalQuestions += count;

    const card = h('button', { className: 'topic-card' });

    const imgFile = topicImages[topic];
    if (imgFile) {
      const thumb = createImg({ className: 'lesson-thumb', src: `${BASE}images/${imgFile}`, alt: '' });
      card.appendChild(thumb);
    }

    const topicName = h('span', { className: 'topic-name' }, topic);

    const saved = loadTopicProgress(topic);
    let answered = 0, correct = 0, incorrect = 0;
    if (saved) {
      const qMap = new Map(topicQuestions.map(q => [q.id, q]));
      for (const [idStr, ans] of Object.entries(saved.answers)) {
        const q = qMap.get(Number(idStr));
        if (q) {
          answered++;
          if (ans === q.correct) correct++;
          else incorrect++;
        }
      }
    }
    totalAnswered += answered;
    totalCorrect += correct;
    totalIncorrect += incorrect;

    const info = h('div', { className: 'topic-info' });
    if (answered > 0) {
      const progress = h('span', { className: 'topic-count' }, `${answered} / ${count}`);
      const stats = h('span', { className: 'topic-stats' });
      const correctSpan = h('span', { className: 'stat-correct' }, `${correct} ✓`);
      const incorrectSpan = h('span', { className: 'stat-incorrect' }, `${incorrect} ✗`);
      stats.append(correctSpan, incorrectSpan);
      info.append(progress, stats);
    } else {
      info.appendChild(h('span', { className: 'topic-count' }, `${count} Fragen`));
    }
    card.append(topicName, info);

    card.addEventListener('click', () => {
      const restored = restoreTopicSession(topic, topicQuestions);
      if (!restored) {
        createSession('topic', topicQuestions, { topicName: topic });
      }
      navigate('quiz');
    });

    grid.appendChild(card);
  }

  // Summary stats under the title
  if (totalAnswered > 0) {
    const summary = h('div', { className: 'topic-summary' });
    summary.append(
      h('span', { className: 'topic-summary-progress' }, `${totalAnswered} / ${totalQuestions}`),
      h('span', { className: 'stat-correct' }, `${totalCorrect} ✓`),
      h('span', { className: 'stat-incorrect' }, `${totalIncorrect} ✗`),
    );
    container.appendChild(summary);
  }

  container.appendChild(grid);

  const cleanupBack = showBackButton(() => navigate('home'));

  return () => {
    cleanupBack();
  };
}
