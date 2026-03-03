import type { Question } from '../data/questions';

export type QuizMode = 'exam' | 'all' | 'topic';

export interface QuizSession {
  mode: QuizMode;
  topicName?: string;
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
  options?: { topicName?: string; timerEnabled?: boolean; timerSeconds?: number }
): QuizSession {
  session = {
    mode,
    topicName: options?.topicName,
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
