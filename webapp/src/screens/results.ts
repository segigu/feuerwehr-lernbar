import { navigate } from '../app';
import { getSession, calculateResults, createSession, saveWrongIds, saveTopicWrongIds } from '../state/quiz-state';
import { saveLessonQuizStats } from '../state/lesson-state';
import { showBackButton } from '../utils/telegram';
import { hapticSuccess, hapticError } from '../utils/telegram';
import { h } from '../utils/dom';
import { playWaterFountain } from '../utils/water-fountain';
import { playFireEffect } from '../utils/fire-effect';

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

  // Compute wrong question IDs (incorrect + unanswered)
  const wrongQuestionIds = results.details
    .filter(d => !d.isCorrect)
    .map(d => d.question.id);

  // Save wrong IDs for retry feature (not for exam mode)
  if (session.mode === 'lesson' && session.lessonId) {
    saveLessonQuizStats(session.lessonId, {
      correct: results.correct,
      wrong: results.incorrect + results.unanswered,
      wrongIds: wrongQuestionIds,
    });
  } else if (session.mode === 'all') {
    saveWrongIds(wrongQuestionIds);
  } else if (session.mode === 'topic' && session.topicName) {
    saveTopicWrongIds(session.topicName, wrongQuestionIds);
  }

  // Celebration / failure effects
  let cleanupEffect: (() => void) | null = null;
  if (results.passed) {
    cleanupEffect = playWaterFountain();
  } else {
    cleanupEffect = playFireEffect();
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

  // "Fehler wiederholen" button (not for exam, only when there are errors)
  const hasErrors = wrongQuestionIds.length > 0 && session.mode !== 'exam';

  if (hasErrors) {
    const retryWrongBtn = h('button', { className: 'action-btn action-primary' },
      `Fehler wiederholen (${wrongQuestionIds.length})`);
    retryWrongBtn.addEventListener('click', () => {
      const wrongQuestions = results.details
        .filter(d => !d.isCorrect)
        .map(d => d.question);
      for (let i = wrongQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongQuestions[i], wrongQuestions[j]] = [wrongQuestions[j], wrongQuestions[i]];
      }
      createSession(session.mode, wrongQuestions, {
        topicName: session.topicName,
        lessonId: session.lessonId,
      });
      navigate('quiz');
    });
    actions.appendChild(retryWrongBtn);
  }

  const reviewBtn = h('button', {
    className: `action-btn ${hasErrors ? 'action-secondary' : 'action-primary'}`
  }, 'Antworten ansehen');
  reviewBtn.addEventListener('click', () => navigate('review'));

  const retryBtn = h('button', { className: 'action-btn action-secondary' }, 'Neuer Versuch');
  retryBtn.addEventListener('click', () => {
    navigate(session.mode === 'topic' ? 'topic-select' : 'home');
  });

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
    cleanupEffect?.();
  };
}
