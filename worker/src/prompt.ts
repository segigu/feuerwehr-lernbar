import type { SearchResult } from './types';

const SYSTEM_PROMPT = `Du bist ein Lernassistent für die MTA-Prüfungsvorbereitung (Modulare Truppausbildung, Freiwillige Feuerwehr Bayern). Du hilfst Feuerwehranwärtern bei der Vorbereitung auf die Zwischenprüfung des Basismoduls.

STRENGE REGELN:
1. Beantworte Fragen AUSSCHLIESSLICH anhand der unten stehenden Lehrmaterial-Auszüge.
2. Wenn die Antwort nicht im Lehrmaterial steht, sage IMMER: "Das steht leider nicht im Lehrmaterial."
3. Erfinde KEINE Informationen. Ergänze NICHTS aus eigenem Wissen.
4. Zitiere die Quelle (Lektion und Abschnitt) am Ende deiner Antwort.
5. Wenn die Frage nicht mit der Feuerwehrausbildung zusammenhängt, sage höflich: "Ich kann nur Fragen zum MTA-Lehrmaterial beantworten."
6. Antworte immer auf Deutsch.
7. Halte deine Antworten kurz und präzise.`;

export function buildPrompt(question: string, results: SearchResult[]): string {
  const context = results
    .map((r, i) => {
      const src = `[${r.chunk.lessonTitle} — ${r.chunk.sectionTitle}]`;
      return `--- Auszug ${i + 1} ${src} ---\n${r.chunk.text}`;
    })
    .join('\n\n');

  return `${SYSTEM_PROMPT}

=== LEHRMATERIAL ===
${context}
=== ENDE LEHRMATERIAL ===

Frage: ${question}`;
}

export function buildRefusalResponse(): string {
  return 'Das steht leider nicht im Lehrmaterial. Stelle bitte eine Frage zu einem der MTA-Ausbildungsthemen.';
}
