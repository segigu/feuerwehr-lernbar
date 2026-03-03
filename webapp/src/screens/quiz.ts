import { navigate } from '../app';
import {
  getSession,
  getCurrentQuestion,
  setAnswer,
  nextQuestion,
  prevQuestion,
  goToQuestion,
  getRemainingSeconds,
  isTimeUp,
} from '../state/quiz-state';
import { createQuestionCard } from '../components/question-card';
import { createProgressBar } from '../components/progress-bar';
import { showMainButton, showBackButton } from '../utils/telegram';
import { h, clear } from '../utils/dom';

export function renderQuiz(container: HTMLElement): () => void {
  const session = getSession();
  if (!session) {
    navigate('home');
    return () => {};
  }

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let cleanupMainBtn: (() => void) | null = null;
  let cleanupBackBtn: (() => void) | null = null;

  const topBar = h('div', { className: 'quiz-top-bar' });
  const progressSlot = h('div', { className: 'quiz-progress-slot' });
  const timerSlot = h('div', { className: 'quiz-timer-slot' });
  topBar.append(progressSlot, timerSlot);

  const questionSlot = h('div', { className: 'quiz-question-slot' });

  const navDots = h('div', { className: 'quiz-nav-dots' });

  const prevBtn = h('button', { className: 'nav-btn nav-prev' }, '\u2190');
  const nextBtn = h('button', { className: 'nav-btn nav-next' }, '\u2192');
  const navButtons = h('div', { className: 'quiz-nav-buttons' }, prevBtn, nextBtn);

  container.append(topBar, questionSlot, navDots, navButtons);

  function renderCurrentQuestion(): void {
    const question = getCurrentQuestion();
    if (!question) return;

    clear(progressSlot);
    progressSlot.appendChild(
      createProgressBar(session!.currentIndex + 1, session!.questions.length)
    );

    clear(questionSlot);
    const selectedAnswer = session!.answers.get(question.id) ?? null;
    const card = createQuestionCard(question, selectedAnswer, (answer) => {
      setAnswer(question.id, answer);
      renderCurrentQuestion();
    });
    questionSlot.appendChild(card);

    renderNavDots();
    updateNavButtons();
    updateMainButton();
  }

  function renderNavDots(): void {
    clear(navDots);
    const total = session!.questions.length;

    // Only show dots if 50 or fewer questions
    if (total > 50) return;

    for (let i = 0; i < total; i++) {
      const q = session!.questions[i];
      const dot = h('button', { className: 'nav-dot' });

      if (i === session!.currentIndex) {
        dot.classList.add('current');
      }
      if (session!.answers.has(q.id)) {
        dot.classList.add('answered');
      }

      dot.addEventListener('click', () => {
        goToQuestion(i);
        renderCurrentQuestion();
      });

      navDots.appendChild(dot);
    }
  }

  function updateNavButtons(): void {
    prevBtn.disabled = session!.currentIndex === 0;
    nextBtn.disabled = session!.currentIndex === session!.questions.length - 1;
  }

  function updateMainButton(): void {
    if (cleanupMainBtn) {
      cleanupMainBtn();
      cleanupMainBtn = null;
    }

    const isLast = session!.currentIndex === session!.questions.length - 1;
    const currentQ = getCurrentQuestion();
    const hasAnswer = currentQ ? session!.answers.has(currentQ.id) : false;

    if (isLast && hasAnswer) {
      cleanupMainBtn = showMainButton('Ergebnis anzeigen', () => {
        navigate('results');
      });
    } else if (hasAnswer) {
      cleanupMainBtn = showMainButton('Nächste Frage', () => {
        nextQuestion();
        renderCurrentQuestion();
      });
    }
  }

  prevBtn.addEventListener('click', () => {
    prevQuestion();
    renderCurrentQuestion();
  });

  nextBtn.addEventListener('click', () => {
    if (nextQuestion()) {
      renderCurrentQuestion();
    }
  });

  // Timer
  if (session.timerEnabled) {
    function updateTimer(): void {
      const remaining = getRemainingSeconds();
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerSlot.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (remaining <= 300) {
        timerSlot.classList.add('timer-warning');
      }

      if (isTimeUp()) {
        navigate('results');
      }
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  // Back button — confirm before leaving
  cleanupBackBtn = showBackButton(() => {
    if (confirm('Prüfung wirklich abbrechen?')) {
      navigate('home');
    }
  });

  renderCurrentQuestion();

  return () => {
    if (timerInterval) clearInterval(timerInterval);
    if (cleanupMainBtn) cleanupMainBtn();
    if (cleanupBackBtn) cleanupBackBtn();
  };
}
