import type { Question } from '../data/questions';
import { h, createImg } from '../utils/dom';
import { hapticSelection } from '../utils/telegram';

export function createQuestionCard(
  question: Question,
  selectedAnswer: 'a' | 'b' | 'c' | null,
  onSelect: (answer: 'a' | 'b' | 'c') => void,
  showFeedback: boolean = false
): HTMLElement {
  const card = h('div', { className: 'question-card' });
  const locked = showFeedback && selectedAnswer !== null;

  const topicBadge = h('span', { className: 'topic-badge' }, question.topic);
  card.appendChild(topicBadge);

  const questionText = h('p', { className: 'question-text' }, question.question);
  card.appendChild(questionText);

  if (question.image) {
    const img = createImg({
      className: 'question-image',
      src: `${import.meta.env.BASE_URL}images/${question.image}`,
      alt: 'Gefahrzeichen',
    });
    card.appendChild(img);
  }

  const optionsContainer = h('div', { className: 'options-container' });

  const keys: Array<'a' | 'b' | 'c'> = ['a', 'b', 'c'];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  const displayLetters = ['A', 'B', 'C'];
  keys.forEach((key, idx) => {
    const isSelected = selectedAnswer === key;
    const isCorrect = key === question.correct;

    const classes: string[] = ['option-btn'];
    const letterClasses: string[] = ['option-letter'];

    if (locked) {
      if (isCorrect) {
        classes.push('correct');
        letterClasses.push('correct');
      }
      if (isSelected && !isCorrect) {
        classes.push('incorrect');
        letterClasses.push('incorrect');
      }
    } else if (isSelected) {
      classes.push('selected');
      letterClasses.push('selected');
    }

    const letterBadge = h('span', { className: letterClasses.join(' ') }, displayLetters[idx]);
    const optionText = h('span', { className: 'option-text' }, question.options[key]);

    const btn = h('button', {
      className: classes.join(' '),
    }, letterBadge, optionText);

    if (!locked) {
      btn.addEventListener('click', () => {
        hapticSelection();
        onSelect(key);
      });
    }

    optionsContainer.appendChild(btn);
  });

  card.appendChild(optionsContainer);
  return card;
}
