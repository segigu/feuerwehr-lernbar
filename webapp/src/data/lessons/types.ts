export type Block =
  | { type: 'text'; de: string; ru: string }
  | { type: 'term'; de: string; ru: string }
  | { type: 'key'; de: string; ru: string }
  | { type: 'warn'; de: string; ru: string }
  | { type: 'list'; items: string[]; itemsRu?: string[] }
  | { type: 'table'; headers: string[]; rows: string[][]; bilingualCols?: number[] };

export interface Section {
  id: string;
  title: string;
  titleRu: string;
  blocks: Block[];
}

export interface LessonQuestion {
  id: number;
  question: string;
  options: { a: string; b: string; c: string };
  image?: string | null;
  correct: 'a' | 'b' | 'c';
  topic: string;
  sectionId?: string;
  explanation?: string;
  explanationRu?: string;
}

export interface Lesson {
  id: string;
  topic: string;
  title: string;
  titleRu: string;
  sections: Section[];
  questions: LessonQuestion[];
  ready: boolean;
}

export interface VocabEntry {
  de: string;
  ru: string;
  sectionTitle: string;
}

export function extractVocab(lesson: Lesson): VocabEntry[] {
  const vocab: VocabEntry[] = [];
  for (const section of lesson.sections) {
    for (const block of section.blocks) {
      if (block.type === 'term') {
        vocab.push({
          de: block.de,
          ru: block.ru,
          sectionTitle: section.title,
        });
      }
    }
  }
  return vocab;
}
