import catalogData from './mta_fragenkatalog.json';

export interface Question {
  id: number;
  question: string;
  options: { a: string; b: string; c: string };
  image: string | null;
  correct: 'a' | 'b' | 'c';
  topic: string;
}

export interface QuestionCatalog {
  meta: {
    title: string;
    source: string;
    version: string;
    date: string;
    total_questions: number;
    exam_format: string;
    topics: string[];
  };
  questions: Question[];
}

const catalog = catalogData as QuestionCatalog;

export const questions: Question[] = catalog.questions;
export const topics: string[] = catalog.meta.topics;
export const meta = catalog.meta;

export function getQuestionsByTopic(topic: string): Question[] {
  return questions.filter(q => q.topic === topic);
}

export function getTopicCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of topics) {
    counts.set(t, questions.filter(q => q.topic === t).length);
  }
  return counts;
}

export function getRandomExamQuestions(count: number = 50): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
