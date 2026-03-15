import type { Lesson, LessonQuestion } from './types';
import type { Question } from '../questions';

import { lesson as rechtsgrundlagen } from './rechtsgrundlagen';
import { lesson as brennenLoeschen } from './brennen-loeschen';
import { lesson as fahrzeugkunde } from './fahrzeugkunde';
import { lesson as persoenlicheAusruestung } from './persoenliche-ausruestung';
import { lesson as schlaeuche } from './schlaeuche-armaturen';
import { lesson as hilfeleistungsgeraete } from './hilfeleistungsgeraete';
import { lesson as rettungsgeraete } from './rettungsgeraete';
import { lesson as belastungen } from './belastungen';
import { lesson as verhaltenEinsatz } from './verhalten-einsatz';
import { lesson as hygiene } from './hygiene';
import { lesson as verhaltenGefahr } from './verhalten-gefahr';
import { lesson as loescheinsatz } from './loescheinsatz';
import { lesson as absturzsicherung } from './absturzsicherung';
import { lesson as hilfeleistungseinsatz } from './hilfeleistungseinsatz';
import { lesson as abcGefahrstoffe } from './abc-gefahrstoffe';
import { lesson as ersteHilfe } from './erste-hilfe';
import { lesson as sprechfunk } from './sprechfunk';

// Ordered by Basismodul chapter number
export const lessons: Lesson[] = [
  rechtsgrundlagen,       // Kap 2.1, 2.2
  brennenLoeschen,        // Kap 3
  fahrzeugkunde,          // Kap 4.1, 13
  persoenlicheAusruestung, // Kap 5.1, 5.2, 5.3
  schlaeuche,             // Kap 5.5
  hilfeleistungsgeraete,  // Kap 5.7, 5.8
  rettungsgeraete,        // Kap 5.9, 5.10
  belastungen,            // Kap 6.2
  verhaltenEinsatz,       // Kap 7.1
  hygiene,                // Kap 7.2
  verhaltenGefahr,        // Kap 8
  loescheinsatz,          // Kap 9.1, 9.3, 9.5
  absturzsicherung,       // Kap 10.1
  hilfeleistungseinsatz,  // Kap 11.1
  abcGefahrstoffe,        // Kap 12.1, 12.2
  ersteHilfe,             // Zusatzthema
  sprechfunk,             // Ergänzungsmodul
];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find(l => l.id === id);
}

export function getLessonByTopic(topic: string): Lesson | undefined {
  return lessons.find(l => l.topic === topic);
}

export function getLessonQuestions(lesson: Lesson): Question[] {
  return lesson.questions.map((lq: LessonQuestion) => ({
    id: lq.id,
    question: lq.question,
    options: lq.options,
    image: lq.image ?? null,
    correct: lq.correct,
    topic: lq.topic,
    sectionId: lq.sectionId,
    explanation: lq.explanation,
    explanationRu: lq.explanationRu,
  }));
}

export { extractVocab } from './types';
export type { Lesson, LessonQuestion, VocabEntry, Block, Section } from './types';
