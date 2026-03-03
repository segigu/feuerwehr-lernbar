import { navigate } from '../app';
import { topics, getQuestionsByTopic } from '../data/questions';
import { createSession } from '../state/quiz-state';
import { showBackButton } from '../utils/telegram';
import { h } from '../utils/dom';

export function renderTopicSelect(container: HTMLElement): () => void {
  const title = h('h1', { className: 'screen-title' }, 'Thema wählen');
  container.appendChild(title);

  const grid = h('div', { className: 'topic-grid' });

  for (const topic of topics) {
    const topicQuestions = getQuestionsByTopic(topic);
    const count = topicQuestions.length;

    const countBadge = h('span', { className: 'topic-count' }, `${count} Fragen`);
    const topicName = h('span', { className: 'topic-name' }, topic);

    const card = h('button', { className: 'topic-card' }, topicName, countBadge);

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
