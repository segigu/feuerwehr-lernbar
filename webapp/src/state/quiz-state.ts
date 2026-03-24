import type { Question } from '../data/questions';
import { questions as allQuestions } from '../data/questions';
import { resetShuffleCache } from '../components/question-card';

export type QuizMode = 'exam' | 'all' | 'topic' | 'lesson';

// ---- localStorage: progress persistence ----

const PROGRESS_KEY = 'mta-progress-all';
const AUTO_ADVANCE_KEY = 'mta-auto-advance';

interface SavedProgress {
  questionIds: number[];
  currentIndex: number;
  answers: Record<number, 'a' | 'b' | 'c'>;
}

export function saveProgress(): void {
  if (!session) return;
  const data: SavedProgress = {
    questionIds: session.questions.map(q => q.id),
    currentIndex: session.currentIndex,
    answers: Object.fromEntries(session.answers),
  };
  if (session.mode === 'all') {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch {}
  } else if (session.mode === 'topic' && session.topicName) {
    try { localStorage.setItem(`mta-progress-topic-${session.topicName}`, JSON.stringify(data)); } catch {}
  }
}

export function loadSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgress;
  } catch { return null; }
}

export function hasSavedProgress(): boolean {
  return loadSavedProgress() !== null;
}

export function clearSavedProgress(): void {
  try { localStorage.removeItem(PROGRESS_KEY); } catch {}
}

// ---- localStorage: per-topic progress ----

export function loadTopicProgress(topicName: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(`mta-progress-topic-${topicName}`);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgress;
  } catch { return null; }
}

export function clearTopicProgress(topicName: string): void {
  try { localStorage.removeItem(`mta-progress-topic-${topicName}`); } catch {}
}

export function restoreTopicSession(topicName: string, topicQuestions: Question[]): QuizSession | null {
  const saved = loadTopicProgress(topicName);
  if (!saved) return null;

  const questionsMap = new Map(topicQuestions.map(q => [q.id, q]));
  const questions = saved.questionIds
    .map(id => questionsMap.get(id))
    .filter((q): q is Question => q !== undefined);

  if (questions.length === 0) {
    clearTopicProgress(topicName);
    return null;
  }

  const answers = new Map<number, 'a' | 'b' | 'c'>();
  for (const [k, v] of Object.entries(saved.answers)) {
    answers.set(Number(k), v as 'a' | 'b' | 'c');
  }

  resetShuffleCache();
  session = {
    mode: 'topic',
    topicName,
    questions,
    currentIndex: Math.min(saved.currentIndex, questions.length - 1),
    answers,
    startTime: Date.now(),
    timerEnabled: false,
    timerSeconds: 0,
  };
  return session;
}

export function restoreSession(): QuizSession | null {
  const saved = loadSavedProgress();
  if (!saved) return null;

  const questionsMap = new Map(allQuestions.map(q => [q.id, q]));
  const questions = saved.questionIds
    .map(id => questionsMap.get(id))
    .filter((q): q is Question => q !== undefined);

  if (questions.length === 0) {
    clearSavedProgress();
    return null;
  }

  const answers = new Map<number, 'a' | 'b' | 'c'>();
  for (const [k, v] of Object.entries(saved.answers)) {
    answers.set(Number(k), v as 'a' | 'b' | 'c');
  }

  session = {
    mode: 'all',
    questions,
    currentIndex: Math.min(saved.currentIndex, questions.length - 1),
    answers,
    startTime: Date.now(),
    timerEnabled: false,
    timerSeconds: 0,
  };
  return session;
}

export function getAutoAdvance(): boolean {
  try {
    const val = localStorage.getItem(AUTO_ADVANCE_KEY);
    return val === null ? true : val === 'true';
  } catch { return true; }
}

export function setAutoAdvancePref(value: boolean): void {
  try { localStorage.setItem(AUTO_ADVANCE_KEY, String(value)); } catch {}
}

// ---- Session management ----

export interface QuizSession {
  mode: QuizMode;
  topicName?: string;
  lessonId?: string;
  questions: Question[];
  currentIndex: number;
  answers: Map<number, 'a' | 'b' | 'c'>;
  startTime: number;
  timerEnabled: boolean;
  timerSeconds: number;
}

let session: QuizSession | null = null;

export function createSession(
  mode: QuizMode,
  questions: Question[],
  options?: { topicName?: string; lessonId?: string; timerEnabled?: boolean; timerSeconds?: number }
): QuizSession {
  resetShuffleCache();
  session = {
    mode,
    topicName: options?.topicName,
    lessonId: options?.lessonId,
    questions,
    currentIndex: 0,
    answers: new Map(),
    startTime: Date.now(),
    timerEnabled: options?.timerEnabled ?? false,
    timerSeconds: options?.timerSeconds ?? 45 * 60,
  };
  return session;
}

export function getSession(): QuizSession | null {
  return session;
}

export function clearSession(): void {
  session = null;
}

export function setAnswer(questionId: number, answer: 'a' | 'b' | 'c'): void {
  if (session) {
    session.answers.set(questionId, answer);
    saveProgress();
  }
}

export function goToQuestion(index: number): void {
  if (session && index >= 0 && index < session.questions.length) {
    session.currentIndex = index;
  }
}

export function nextQuestion(): boolean {
  if (session && session.currentIndex < session.questions.length - 1) {
    session.currentIndex++;
    return true;
  }
  return false;
}

export function prevQuestion(): boolean {
  if (session && session.currentIndex > 0) {
    session.currentIndex--;
    return true;
  }
  return false;
}

export function getCurrentQuestion(): Question | null {
  if (!session) return null;
  return session.questions[session.currentIndex];
}

export function getElapsedSeconds(): number {
  if (!session) return 0;
  return Math.floor((Date.now() - session.startTime) / 1000);
}

export function getRemainingSeconds(): number {
  if (!session) return 0;
  const elapsed = getElapsedSeconds();
  return Math.max(0, session.timerSeconds - elapsed);
}

export function isTimeUp(): boolean {
  if (!session || !session.timerEnabled) return false;
  return getRemainingSeconds() <= 0;
}

export interface QuizResults {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
  passed: boolean;
  details: Array<{
    question: Question;
    selected: 'a' | 'b' | 'c' | null;
    correct: 'a' | 'b' | 'c';
    isCorrect: boolean;
  }>;
}

export function calculateResults(): QuizResults | null {
  if (!session) return null;

  const details = session.questions.map(q => {
    const selected = session!.answers.get(q.id) ?? null;
    return {
      question: q,
      selected,
      correct: q.correct,
      isCorrect: selected === q.correct,
    };
  });

  const correct = details.filter(d => d.isCorrect).length;
  const unanswered = details.filter(d => d.selected === null).length;
  const total = session.questions.length;
  const percentage = Math.round((correct / total) * 100);
  const passThreshold = session.mode === 'exam' ? 0.5 : 0;
  const passed = correct / total >= passThreshold;

  return {
    total,
    correct,
    incorrect: total - correct - unanswered,
    unanswered,
    percentage,
    passed,
    details,
  };
}
