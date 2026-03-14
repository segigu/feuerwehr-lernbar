import { navigate, getNavigationParams } from '../app';
import { getLessonById, extractVocab, getLessonQuestions } from '../data/lessons';
import { getLessonLearnProgress, getLessonQuizStats, getLessonVocabStats, resetLessonProgress } from '../state/lesson-state';
import { getLanguage } from '../state/app-state';
import { createSession } from '../state/quiz-state';
import { showBackButton } from '../utils/telegram';
import { h } from '../utils/dom';

export function renderLessonDetail(container: HTMLElement): () => void {
  const params = getNavigationParams();
  const lesson = params?.lessonId ? getLessonById(params.lessonId) : undefined;

  if (!lesson) {
    navigate('lessons');
    return () => {};
  }

  const lang = getLanguage();
  const vocab = extractVocab(lesson);

  const backLink = h('button', { className: 'back-link' }, '\u2190 Unterricht');
  backLink.addEventListener('click', () => navigate('lessons'));
  container.appendChild(backLink);

  // Header
  const header = h('div', { className: 'home-header' });
  const title = h('h1', { className: 'home-title' }, lesson.title);
  if (lang === 'de+ru') {
    const titleRu = h('p', { className: 'home-subtitle' }, lesson.titleRu);
    header.append(title, titleRu);
  } else {
    header.appendChild(title);
  }
  container.appendChild(header);

  // Menu cards
  const cards = h('div', { className: 'home-cards' });

  // 1. Lernen
  const learnProgress = getLessonLearnProgress(lesson.id);
  const totalSections = lesson.sections.length;
  const doneSections = learnProgress.completedSections.length;
  const learnBadge = lesson.ready
    ? `${doneSections} von ${totalSections} Abschnitten`
    : 'In Arbeit';

  const learnCard = createMenuCard(
    'Lernen',
    learnBadge,
    lesson.ready ? 'Unterrichtsmaterial durchgehen' : 'Inhalte werden noch erstellt',
    () => {
      navigate('learn', { lessonId: lesson.id });
    }
  );
  cards.appendChild(learnCard);

  // 2. Quiz
  const quizStats = getLessonQuizStats(lesson.id);
  const quizBadge = quizStats
    ? `${quizStats.correct} richtig, ${quizStats.wrong} falsch`
    : `${lesson.questions.length} Fragen`;

  const quizCard = createMenuCard(
    'Quiz',
    quizBadge,
    'Wissen überprüfen',
    () => {
      const questions = getLessonQuestions(lesson);
      // Shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      createSession('lesson', questions, {
        lessonId: lesson.id,
        topicName: lesson.title,
      });
      navigate('quiz');
    }
  );
  cards.appendChild(quizCard);

  // 3. Vokabeln (only if de+ru and has vocab)
  if (lang === 'de+ru' && vocab.length > 0 && lesson.ready) {
    const vocabStats = getLessonVocabStats(lesson.id);
    const vocabBadge = vocabStats
      ? `${vocabStats.known} gewusst, ${vocabStats.unknown} nicht`
      : `${vocab.length} Begriffe`;

    const vocabCard = createMenuCard(
      'Vokabeln',
      vocabBadge,
      'Fachbegriffe lernen (DE \u2194 RU)',
      () => {
        navigate('vocab', { lessonId: lesson.id, vocabDirection: 'de-ru' });
      }
    );
    cards.appendChild(vocabCard);
  }

  container.appendChild(cards);

  // Stats section
  if (quizStats || doneSections > 0) {
    const statsSection = h('div', { className: 'lesson-stats' });
    const statsTitle = h('h3', { className: 'lesson-stats-title' }, 'Statistik');
    statsSection.appendChild(statsTitle);

    if (quizStats) {
      const total = quizStats.correct + quizStats.wrong;
      const pct = total > 0 ? Math.round((quizStats.correct / total) * 100) : 0;
      const row = h('div', { className: 'lesson-stats-row' });
      row.append(
        h('span', null, 'Quiz'),
        h('span', { className: 'lesson-stats-value' }, `${pct}% (${quizStats.correct}/${total})`)
      );
      statsSection.appendChild(row);

      if (quizStats.wrongIds.length > 0) {
        const errRow = h('div', { className: 'lesson-stats-row' });
        errRow.append(
          h('span', null, 'Fehler'),
          h('span', { className: 'lesson-stats-value lesson-stats-error' }, `${quizStats.wrongIds.length}`)
        );
        statsSection.appendChild(errRow);
      }
    }

    if (doneSections > 0) {
      const row = h('div', { className: 'lesson-stats-row' });
      row.append(
        h('span', null, 'Lernen'),
        h('span', { className: 'lesson-stats-value' }, `${doneSections}/${totalSections}`)
      );
      statsSection.appendChild(row);
    }

    const resetBtn = h('button', { className: 'lesson-stats-reset' }, 'Statistik zur\u00FCcksetzen');
    resetBtn.addEventListener('click', () => {
      if (confirm('Statistik f\u00FCr dieses Thema zur\u00FCcksetzen?')) {
        resetLessonProgress(lesson.id);
        navigate('lesson-detail', { lessonId: lesson.id });
      }
    });
    statsSection.appendChild(resetBtn);

    container.appendChild(statsSection);
  }

  const cleanupBack = showBackButton(() => navigate('lessons'));
  return () => { cleanupBack(); };
}

function createMenuCard(title: string, badge: string, desc: string, onClick: () => void): HTMLElement {
  const card = h('button', { className: 'home-card' });
  card.append(
    h('h2', { className: 'home-card-title' }, title),
    h('span', { className: 'home-card-badge' }, badge),
    h('p', { className: 'home-card-desc' }, desc)
  );
  card.addEventListener('click', onClick);
  return card;
}
