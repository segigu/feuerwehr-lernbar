import type { Lesson, LessonQuestion } from './types';
import type { Question } from '../questions';

import { lesson as rechtsgrundlagen } from './rechtsgrundlagen';
import { lesson as brennenLoeschen } from './brennen-loeschen';
import { lesson as fahrzeugkunde } from './fahrzeugkunde';
import { lesson as persoenlicheAusruestung } from './persoenliche-ausruestung';
import { lesson as geraeteArmaturen } from './geraete-armaturen';
import { lesson as rettungLeiternKnoten } from './rettung-leitern-knoten';
import { lesson as ersteHilfe } from './erste-hilfe';
import { lesson as einsatzgrundsaetze } from './einsatzgrundsaetze';
import { lesson as loescheinsatz } from './loescheinsatz';
import { lesson as absturzsicherung } from './absturzsicherung';
import { lesson as technischeHilfeleistung } from './technische-hilfeleistung';
import { lesson as sprechfunk } from './sprechfunk';

export const lessons: Lesson[] = [
  rechtsgrundlagen,
  brennenLoeschen,
  fahrzeugkunde,
  persoenlicheAusruestung,
  geraeteArmaturen,
  rettungLeiternKnoten,
  ersteHilfe,
  einsatzgrundsaetze,
  loescheinsatz,
  absturzsicherung,
  technischeHilfeleistung,
  sprechfunk,
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
