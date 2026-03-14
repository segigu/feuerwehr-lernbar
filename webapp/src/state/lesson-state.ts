// Per-lesson progress stored in localStorage

interface LearnProgress {
  completedSections: string[];
}

interface QuizStats {
  correct: number;
  wrong: number;
  wrongIds: number[];
}

interface VocabStats {
  known: number;
  unknown: number;
}

function key(lessonId: string, suffix: string): string {
  return `mta-lesson-${lessonId}-${suffix}`;
}

function load<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function save(k: string, data: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(data));
  } catch {}
}

// Learn progress
export function getLessonLearnProgress(lessonId: string): LearnProgress {
  return load<LearnProgress>(key(lessonId, 'learn')) ?? { completedSections: [] };
}

export function markSectionComplete(lessonId: string, sectionId: string): void {
  const progress = getLessonLearnProgress(lessonId);
  if (!progress.completedSections.includes(sectionId)) {
    progress.completedSections.push(sectionId);
    save(key(lessonId, 'learn'), progress);
  }
}

// Quiz stats
export function getLessonQuizStats(lessonId: string): QuizStats | null {
  return load<QuizStats>(key(lessonId, 'quiz'));
}

export function saveLessonQuizStats(lessonId: string, stats: QuizStats): void {
  save(key(lessonId, 'quiz'), stats);
}

// Vocab stats
export function getLessonVocabStats(lessonId: string): VocabStats | null {
  return load<VocabStats>(key(lessonId, 'vocab'));
}

export function saveLessonVocabStats(lessonId: string, stats: VocabStats): void {
  save(key(lessonId, 'vocab'), stats);
}

// Reset all progress for a lesson
export function resetLessonProgress(lessonId: string): void {
  try {
    localStorage.removeItem(key(lessonId, 'learn'));
    localStorage.removeItem(key(lessonId, 'quiz'));
    localStorage.removeItem(key(lessonId, 'vocab'));
  } catch {}
}
