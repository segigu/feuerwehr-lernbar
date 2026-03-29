import type { SearchResult } from './types';

const SYSTEM_PROMPT = `Du bist ein KI-Ausbilder für die MTA-Prüfungsvorbereitung (Modulare Truppausbildung, Freiwillige Feuerwehr Bayern). Du hilfst Feuerwehranwärtern bei der Vorbereitung auf die Zwischenprüfung des Basismoduls.

REGELN:
1. Beantworte Fragen anhand der unten stehenden Lehrmaterial-Auszüge. Nutze die bereitgestellten Auszüge als Hauptquelle.
2. Die Auszüge stammen aus verschiedenen Lektionen des gesamten MTA-Lehrmaterials. Beantworte Fragen zu ALLEN MTA-Themen — nicht nur zur aktuell angezeigten Lektion.
3. Wenn die Auszüge hilfreiche Informationen enthalten, beantworte die Frage basierend darauf — auch wenn die Antwort aus einer anderen Lektion stammt.
4. Wenn die Auszüge keine passende Antwort enthalten, sage: "Dazu hab ich leider nichts Passendes im Lehrmaterial gefunden."
5. Erfinde KEINE Informationen. Ergänze NICHTS aus eigenem Wissen.
6. Nenne KEINE Quellen oder Auszug-Nummern in deiner Antwort — die Quellenangabe erfolgt automatisch.
7. Wenn die Frage ÜBERHAUPT NICHT mit der Feuerwehrausbildung zusammenhängt (z.B. Kochen, Politik, Sport), antworte mit MAXIMAL 1-2 kurzen Sätzen humorvoll im fränkischen Stil und einer Einladung zur MTA-Frage. Beispiele:
   - "Des is wie wenn'd zum Metzger gehst und nach'm Haarschnitt fragst — ich mach nur MTA!"
   - "Drei Sachen kann der Franke: Bratwurst, Bier und Feuerwehr. Und nur zum Dritten kann ich was sagen. Frag mich was zur MTA-Prüfung!"
8. Antworte immer auf Deutsch.
9. Halte deine Antworten kurz und präzise.`;

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

// Off-topic refusals — question has nothing to do with firefighting/MTA
const FUNNY_REFUSALS = [
  'Des is wie wenn\'d zum Metzger gehst und nach\'m Haarschnitt fragst. Ich bin nur für die MTA-Prüfung da! 💇🔥',
  'Ich bin so spezialisiert wie a Nürnberger Rostbratwurst — nur eins, aber des richtig: Feuerwehr! 🌭 Frag mich was zum MTA-Stoff!',
  'Drei Sachen kann der Franke: Bratwurst, Bier und Feuerwehr. Und nur zum Dritten kann ich was sagen. Also — MTA-Frage her!',
  'Also wenn ich des wüsst, wär ich Philosophie-Professor und ned bei der Feuerwehr. Frag mich was wo brennt — MTA-Themen!',
  'Des hat mit Feuerwehr so viel zu tun wie a Fisch mit\'m Fahrrad. Aber a MTA-Frage? Da bin ich heißer drauf als a Vollbrand! 🔥',
];

// No-context refusals — question might be MTA-related but RAG found nothing
const NO_CONTEXT_REFUSALS = [
  'Hmm, dazu hab ich grad nix Passendes im Lehrmaterial gfunden. Versuch\'s mal mit anderen Stichwörtern! 🔍',
  'Des Thema hab ich im Lehrmaterial ned aufspüren können. Formulier die Frage vielleicht a bissl anders? 🤔',
  'Ich hab hin und her gsucht, aber zu der Frage find ich grad nix im Material. Probier\'s nochmal mit konkreteren Begriffen!',
  'Mei Lehrmaterial schweigt sich dazu aus. Vielleicht hilfts, wenn du des genauer formulierst oder a bestimmtes Thema nennst? 📚',
];

export function buildRefusalResponse(): string {
  return FUNNY_REFUSALS[Math.floor(Math.random() * FUNNY_REFUSALS.length)];
}

export function buildNoContextResponse(): string {
  return NO_CONTEXT_REFUSALS[Math.floor(Math.random() * NO_CONTEXT_REFUSALS.length)];
}
