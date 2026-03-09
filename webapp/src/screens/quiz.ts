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
  saveProgress,
  getAutoAdvance,
  setAutoAdvancePref,
  clearSavedProgress,
  createSession,
} from '../state/quiz-state';
import { questions, getRandomExamQuestions } from '../data/questions';
import { createQuestionCard } from '../components/question-card';
import { createProgressBar } from '../components/progress-bar';
import { showBackButton } from '../utils/telegram';
import { h, clear } from '../utils/dom';

export function renderQuiz(container: HTMLElement): () => void {
  const session = getSession();
  if (!session) {
    navigate('home');
    return () => {};
  }

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let cleanupBackBtn: (() => void) | null = null;
  let slideDirection: 'up' | 'down' | null = null;
  let autoAdvance = getAutoAdvance();

  // Close button in top bar
  const closeBtn = h('button', { className: 'quiz-close-btn' }, '\u2715');
  closeBtn.addEventListener('click', () => {
    if (confirm('Prüfung wirklich abbrechen?')) {
      navigate('home');
    }
  });

  const topBar = h('div', { className: 'quiz-top-bar' });
  const progressSlot = h('div', { className: 'quiz-progress-slot' });
  const timerSlot = h('div', { className: 'quiz-timer-slot' });
  topBar.append(closeBtn, progressSlot, timerSlot);

  const questionSlot = h('div', { className: 'quiz-question-slot' });

  const prevBtn = h('button', { className: 'nav-arrow nav-prev' }, '\u2190');
  const nextBtn = h('button', { className: 'nav-arrow nav-next' }, '\u2192');
  const navDots = h('div', { className: 'quiz-nav-dots' });

  // Nav center: dots (if ≤50) or controls (toggle + reset)
  const navCenter = h('div', { className: 'quiz-nav-center' });

  // Auto-advance toggle
  const toggleBtn = h('button', {
    className: `auto-advance-toggle${autoAdvance ? ' active' : ''}`,
  });
  const toggleTrack = h('span', { className: 'toggle-track' });
  const toggleText = h('span', { className: 'toggle-text' }, 'Auto');
  toggleBtn.append(toggleTrack, toggleText);
  toggleBtn.addEventListener('click', () => {
    autoAdvance = !autoAdvance;
    setAutoAdvancePref(autoAdvance);
    toggleBtn.classList.toggle('active', autoAdvance);
  });

  navCenter.appendChild(navDots);

  const navControls = h('div', { className: 'nav-controls' });
  navControls.appendChild(toggleBtn);

  if (session.mode === 'all') {
    const resetBtn = h('button', { className: 'quiz-reset-btn' }, 'Neu starten');
    resetBtn.addEventListener('click', () => {
      if (confirm('Fortschritt zurücksetzen und neu starten?')) {
        clearSavedProgress();
        createSession('all', getRandomExamQuestions(questions.length));
        navigate('quiz');
      }
    });
    navControls.appendChild(resetBtn);
  }

  navCenter.appendChild(navControls);

  const navRow = h('div', { className: 'quiz-nav-row' }, prevBtn, navCenter, nextBtn);
  container.append(topBar, questionSlot, navRow);

  function applySlideAnimation(): void {
    questionSlot.classList.remove('slide-up', 'slide-down');
    if (slideDirection) {
      // Force reflow to restart animation
      void questionSlot.offsetHeight;
      questionSlot.classList.add(slideDirection === 'up' ? 'slide-up' : 'slide-down');
    }
    slideDirection = null;
  }

  function renderCurrentQuestion(): void {
    const question = getCurrentQuestion();
    if (!question) return;

    clear(progressSlot);
    progressSlot.appendChild(
      createProgressBar(session!.currentIndex + 1, session!.questions.length)
    );

    clear(questionSlot);
    const selectedAnswer = session!.answers.get(question.id) ?? null;
    const isTraining = session!.mode !== 'exam';
    const card = createQuestionCard(question, selectedAnswer, (answer) => {
      setAnswer(question.id, answer);

      const isLast = session!.currentIndex === session!.questions.length - 1;

      // Re-render to show selected/feedback state (no slide)
      slideDirection = null;
      renderCurrentQuestion();

      if (!autoAdvance) return;

      const delay = isTraining ? 2200 : 1500;
      if (isLast) {
        setTimeout(() => {
          clearSavedProgress();
          navigate('results');
        }, delay + 100);
      } else {
        setTimeout(() => {
          slideDirection = 'up';
          nextQuestion();
          saveProgress();
          renderCurrentQuestion();
        }, delay);
      }
    }, isTraining);
    questionSlot.appendChild(card);

    applySlideAnimation();
    renderNavDots();
    updateNavButtons();
  }

  function renderNavDots(): void {
    clear(navDots);
    const total = session!.questions.length;

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
        const currentIdx = session!.currentIndex;
        if (i === currentIdx) return;
        slideDirection = i > currentIdx ? 'up' : 'down';
        goToQuestion(i);
        saveProgress();
        renderCurrentQuestion();
      });

      navDots.appendChild(dot);
    }
  }

  function updateNavButtons(): void {
    prevBtn.disabled = session!.currentIndex === 0;
    nextBtn.disabled = session!.currentIndex === session!.questions.length - 1;
  }

  prevBtn.addEventListener('click', () => {
    slideDirection = 'down';
    prevQuestion();
    saveProgress();
    renderCurrentQuestion();
  });

  nextBtn.addEventListener('click', () => {
    slideDirection = 'up';
    if (nextQuestion()) {
      saveProgress();
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

  // Telegram Back button
  cleanupBackBtn = showBackButton(() => {
    if (confirm('Prüfung wirklich abbrechen?')) {
      navigate('home');
    }
  });

  renderCurrentQuestion();

  return () => {
    if (timerInterval) clearInterval(timerInterval);
    if (cleanupBackBtn) cleanupBackBtn();
  };
}
