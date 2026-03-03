import type { Question } from '../data/questions';
import { h } from '../utils/dom';
import { hapticSelection } from '../utils/telegram';

export function createQuestionCard(
  question: Question,
  selectedAnswer: 'a' | 'b' | 'c' | null,
  onSelect: (answer: 'a' | 'b' | 'c') => void
): HTMLElement {
  const card = h('div', { className: 'question-card' });

  const topicBadge = h('span', { className: 'topic-badge' }, question.topic);
  card.appendChild(topicBadge);

  const questionText = h('p', { className: 'question-text' }, question.question);
  card.appendChild(questionText);

  if (question.image) {
    const img = h('img', {
      className: 'question-image',
      src: `${import.meta.env.BASE_URL}images/${question.image}`,
      alt: 'Gefahrzeichen',
    });
    card.appendChild(img);
  }

  const optionsContainer = h('div', { className: 'options-container' });

  const keys: Array<'a' | 'b' | 'c'> = ['a', 'b', 'c'];
  for (const key of keys) {
    const isSelected = selectedAnswer === key;

    const letterBadge = h('span', { className: `option-letter${isSelected ? ' selected' : ''}` }, key.toUpperCase());
    const optionText = h('span', { className: 'option-text' }, question.options[key]);

    const btn = h('button', {
      className: `option-btn${isSelected ? ' selected' : ''}`,
    }, letterBadge, optionText);

    btn.addEventListener('click', () => {
      hapticSelection();
      onSelect(key);
    });

    optionsContainer.appendChild(btn);
  }

  card.appendChild(optionsContainer);
  return card;
}
