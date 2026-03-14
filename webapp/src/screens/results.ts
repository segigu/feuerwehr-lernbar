import { navigate } from '../app';
import { getSession, calculateResults } from '../state/quiz-state';
import { saveLessonQuizStats } from '../state/lesson-state';
import { showBackButton } from '../utils/telegram';
import { hapticSuccess, hapticError } from '../utils/telegram';
import { h } from '../utils/dom';

export function renderResults(container: HTMLElement): () => void {
  const session = getSession();
  const results = calculateResults();

  if (!session || !results) {
    navigate('home');
    return () => {};
  }

  if (session.mode === 'exam') {
    if (results.passed) {
      hapticSuccess();
    } else {
      hapticError();
    }
  }

  // Save lesson quiz stats
  if (session.mode === 'lesson' && session.lessonId) {
    const wrongIds = results.details
      .filter(d => !d.isCorrect && d.selected !== null)
      .map(d => d.question.id);
    saveLessonQuizStats(session.lessonId, {
      correct: results.correct,
      wrong: results.incorrect,
      wrongIds,
    });
  }

  // Score circle
  const scoreCircle = h('div', { className: `score-circle ${results.passed ? 'passed' : 'failed'}` });

  const scoreNumber = h('div', { className: 'score-number' }, `${results.correct}`);
  const scoreTotal = h('div', { className: 'score-total' }, `von ${results.total}`);
  const scorePct = h('div', { className: 'score-pct' }, `${results.percentage}%`);

  scoreCircle.append(scoreNumber, scoreTotal, scorePct);
  container.appendChild(scoreCircle);

  // Pass/fail badge (only for exam mode)
  if (session.mode === 'exam') {
    const badge = h('div', {
      className: `result-badge ${results.passed ? 'passed' : 'failed'}`
    }, results.passed ? 'Bestanden' : 'Nicht bestanden');
    container.appendChild(badge);
  }

  // Stats row
  const statsRow = h('div', { className: 'stats-row' });

  const statCorrect = h('div', { className: 'stat-item stat-correct' });
  statCorrect.append(
    h('div', { className: 'stat-value' }, `${results.correct}`),
    h('div', { className: 'stat-label' }, 'Richtig')
  );

  const statIncorrect = h('div', { className: 'stat-item stat-incorrect' });
  statIncorrect.append(
    h('div', { className: 'stat-value' }, `${results.incorrect}`),
    h('div', { className: 'stat-label' }, 'Falsch')
  );

  const statUnanswered = h('div', { className: 'stat-item stat-unanswered' });
  statUnanswered.append(
    h('div', { className: 'stat-value' }, `${results.unanswered}`),
    h('div', { className: 'stat-label' }, 'Offen')
  );

  statsRow.append(statCorrect, statIncorrect, statUnanswered);
  container.appendChild(statsRow);

  // Action buttons
  const actions = h('div', { className: 'result-actions' });

  const reviewBtn = h('button', { className: 'action-btn action-primary' }, 'Antworten ansehen');
  reviewBtn.addEventListener('click', () => navigate('review'));

  const retryBtn = h('button', { className: 'action-btn action-secondary' }, 'Neuer Versuch');
  retryBtn.addEventListener('click', () => navigate('home'));

  actions.append(reviewBtn, retryBtn);

  // Lesson mode: add "Zurück zur Lektion" button
  if (session.mode === 'lesson' && session.lessonId) {
    const lessonId = session.lessonId;
    const backToLessonBtn = h('button', { className: 'action-btn action-secondary' }, 'Zurück zur Lektion');
    backToLessonBtn.addEventListener('click', () => {
      navigate('lesson-detail', { lessonId });
    });
    actions.appendChild(backToLessonBtn);
  }

  container.appendChild(actions);

  const backTarget = session.mode === 'lesson' && session.lessonId
    ? () => navigate('lesson-detail', { lessonId: session!.lessonId! })
    : () => navigate('home');
  const cleanupBack = showBackButton(backTarget);

  return () => {
    cleanupBack();
  };
}
