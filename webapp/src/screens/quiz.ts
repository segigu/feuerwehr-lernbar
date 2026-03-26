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
  clearTopicProgress,
  createSession,
} from '../state/quiz-state';
import { questions, getRandomExamQuestions, getQuestionsByTopic } from '../data/questions';
import { getLessonById, getLessonByTopic } from '../data/lessons';
import { getLanguage } from '../state/app-state';
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
  let slideDirection: 'left' | 'right' | null = null;
  let autoAdvance = getAutoAdvance();

  // Lesson-aware exit
  const isLesson = session.mode === 'lesson';
  const confirmText = isLesson ? 'Quiz wirklich abbrechen?' : 'Prüfung wirklich abbrechen?';
  function exitQuiz(): void {
    if (isLesson && session!.lessonId) {
      navigate('lesson-detail', { lessonId: session!.lessonId });
    } else if (session!.mode === 'topic') {
      navigate('topic-select');
    } else {
      navigate('home');
    }
  }

  // Close button in top bar
  const closeBtn = h('button', { className: 'quiz-close-btn' }, '\u2715');
  closeBtn.addEventListener('click', () => {
    if (confirm(confirmText)) exitQuiz();
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
  } else if (session.mode === 'topic' && session.topicName) {
    const topicName = session.topicName;
    const resetBtn = h('button', { className: 'quiz-reset-btn' }, 'Neu starten');
    resetBtn.addEventListener('click', () => {
      if (confirm('Fortschritt zurücksetzen und neu starten?')) {
        clearTopicProgress(topicName);
        const topicQuestions = getQuestionsByTopic(topicName);
        createSession('topic', topicQuestions, { topicName });
        navigate('quiz');
      }
    });
    navControls.appendChild(resetBtn);
  }

  navCenter.appendChild(navControls);

  const navRow = h('div', { className: 'quiz-nav-row' }, prevBtn, navCenter, nextBtn);
  container.append(topBar, questionSlot, navRow);

  function applySlideAnimation(): void {
    questionSlot.classList.remove('slide-left', 'slide-right');
    if (slideDirection) {
      // Force reflow to restart animation
      void questionSlot.offsetHeight;
      questionSlot.classList.add(slideDirection === 'left' ? 'slide-left' : 'slide-right');
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

      // Pulse the next button after a delay to draw attention
      setTimeout(() => {
        nextBtn.classList.remove('pulse');
        void nextBtn.offsetHeight;
        nextBtn.classList.add('pulse');
      }, 1000);

      if (isLast) {
        if (!autoAdvance) return;

        const allAnswered = session!.answers.size === session!.questions.length;
        if (!allAnswered) return;

        const delay = isTraining ? 2200 : 1500;
        setTimeout(() => {
          if (session!.mode === 'all') clearSavedProgress();
          navigate('results');
        }, delay);
        return;
      }

      if (!autoAdvance) return;

      const delay = isTraining ? 2200 : 1500;
      setTimeout(() => {
        slideDirection = 'left';
        nextQuestion();
        saveProgress();
        renderCurrentQuestion();
      }, delay);
    }, isTraining);
    questionSlot.appendChild(card);

    // Explanation block + lesson link — show after answer in training mode
    if (selectedAnswer !== null && isTraining) {
      const lesson = isLesson && session!.lessonId
        ? getLessonById(session!.lessonId)
        : getLessonByTopic(question.topic);

      // Look up explanation from lesson if the question itself doesn't have one
      let explanation = question.explanation;
      let explanationRu = question.explanationRu;
      let sectionId = question.sectionId;
      if (!explanation && lesson) {
        const lessonQ = lesson.questions.find(lq => lq.question === question.question);
        if (lessonQ) {
          explanation = lessonQ.explanation;
          explanationRu = lessonQ.explanationRu;
          sectionId = lessonQ.sectionId;
        }
      }

      if (explanation) {
        const explBlock = h('div', { className: 'quiz-explanation' });
        const explTitle = h('p', { className: 'quiz-explanation-title' }, '\u2727 Theorie');
        explBlock.appendChild(explTitle);
        const explDe = h('p', { className: 'quiz-explanation-de' });
        explDe.textContent = explanation;
        explBlock.appendChild(explDe);

        if (getLanguage() === 'de+ru' && explanationRu) {
          const explRu = h('p', { className: 'quiz-explanation-ru' });
          explRu.textContent = explanationRu;
          explBlock.appendChild(explRu);
        }

        if (lesson && lesson.ready) {
          const lessonLink = h('button', { className: 'quiz-explanation-link' }, 'Zur Lektion \u2192');
          lessonLink.addEventListener('click', () => {
            navigate('learn', { lessonId: lesson.id, sectionId, fromQuiz: true });
          });
          const linkRow = h('div', { className: 'quiz-explanation-link-row' });
          linkRow.appendChild(lessonLink);
          explBlock.appendChild(linkRow);
        }

        card.appendChild(explBlock);
      } else if (lesson && lesson.ready) {
        const theoryBtn = h('button', { className: 'theory-btn' }, 'Theorie');
        theoryBtn.addEventListener('click', () => {
          navigate('learn', { lessonId: lesson.id, fromQuiz: true });
        });
        card.appendChild(theoryBtn);
      }
    }

    applySlideAnimation();
    renderNavDots();
    updateNavButtons();
  }

  function renderNavDots(): void {
    clear(navDots);
    const total = session!.questions.length;
    const isExam = session!.mode === 'exam';

    if (total > 50) return;

    for (let i = 0; i < total; i++) {
      const q = session!.questions[i];
      const dot = h('button', { className: 'nav-dot' });

      if (i === session!.currentIndex) {
        dot.classList.add('current');
      }
      const answer = session!.answers.get(q.id);
      if (answer !== undefined) {
        if (!isExam) {
          dot.classList.add(answer === q.correct ? 'dot-correct' : 'dot-incorrect');
        } else {
          dot.classList.add('answered');
        }
      }

      dot.addEventListener('click', () => {
        const currentIdx = session!.currentIndex;
        if (i === currentIdx) return;
        slideDirection = i > currentIdx ? 'left' : 'right';
        goToQuestion(i);
        saveProgress();
        renderCurrentQuestion();
      });

      navDots.appendChild(dot);
    }
  }

  function updateNavButtons(): void {
    prevBtn.disabled = session!.currentIndex === 0;
    const isLast = session!.currentIndex === session!.questions.length - 1;
    const allAnswered = session!.answers.size === session!.questions.length;
    nextBtn.disabled = false;
    nextBtn.textContent = (isLast && allAnswered) ? '\u2713' : '\u2192';
  }

  prevBtn.addEventListener('click', () => {
    slideDirection = 'right';
    prevQuestion();
    saveProgress();
    renderCurrentQuestion();
  });

  nextBtn.addEventListener('click', () => {
    const isLast = session!.currentIndex === session!.questions.length - 1;
    if (isLast) {
      const allAnswered = session!.answers.size === session!.questions.length;
      if (!allAnswered) {
        const unansweredIdx = session!.questions.findIndex(q => !session!.answers.has(q.id));
        if (unansweredIdx !== -1) {
          slideDirection = unansweredIdx < session!.currentIndex ? 'right' : 'left';
          goToQuestion(unansweredIdx);
          renderCurrentQuestion();
        }
        return;
      }
      if (session!.mode === 'all') clearSavedProgress();
      navigate('results');
      return;
    }
    slideDirection = 'left';
    if (nextQuestion()) {
      saveProgress();
      renderCurrentQuestion();
    }
  });

  // Swipe navigation
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  questionSlot.addEventListener('touchstart', (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  questionSlot.addEventListener('touchend', (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Ignore if vertical swipe is dominant
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    if (dx < 0) {
      // Swipe left → next
      nextBtn.click();
    } else {
      // Swipe right → previous
      prevBtn.click();
    }
  }, { passive: true });

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
    if (confirm(confirmText)) exitQuiz();
  });

  renderCurrentQuestion();

  return () => {
    if (timerInterval) clearInterval(timerInterval);
    if (cleanupBackBtn) cleanupBackBtn();
  };
}
