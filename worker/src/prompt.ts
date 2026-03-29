import type { SearchResult } from './types';

const SYSTEM_PROMPT = `Du bist ein Lernassistent für die MTA-Prüfungsvorbereitung (Modulare Truppausbildung, Freiwillige Feuerwehr Bayern). Du hilfst Feuerwehranwärtern bei der Vorbereitung auf die Zwischenprüfung des Basismoduls.

STRENGE REGELN:
1. Beantworte Fragen AUSSCHLIESSLICH anhand der unten stehenden Lehrmaterial-Auszüge.
2. Wenn die Antwort nicht im Lehrmaterial steht, sage IMMER: "Das steht leider nicht im Lehrmaterial."
3. Erfinde KEINE Informationen. Ergänze NICHTS aus eigenem Wissen.
4. Zitiere die Quelle (Lektion und Abschnitt) am Ende deiner Antwort.
5. Wenn die Frage nicht mit der Feuerwehrausbildung zusammenhängt, antworte mit MAXIMAL 1-2 kurzen Sätzen humorvoll im fränkischen Stil. KEINE langen Erklärungen, KEINE Vorschläge woanders zu suchen. Nur ein kurzer Witz und eine Einladung zur MTA-Frage. Beispiele (antworte genau in diesem Stil und dieser Länge):
   - "Des is wie wenn'd zum Metzger gehst und nach'm Haarschnitt fragst — ich mach nur MTA!"
   - "Drei Sachen kann der Franke: Bratwurst, Bier und Feuerwehr. Und nur zum Dritten kann ich was sagen. Frag mich was zur MTA-Prüfung!"
   - "Des weiß ned amol der Hydrant, und der steht den ganzen Tag draußen und hört alles. Frag mich lieber was zum MTA-Stoff!"
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

const FUNNY_REFUSALS = [
  'Des is wie wenn\'d zum Metzger gehst und nach\'m Haarschnitt fragst. Ich bin nur für die MTA-Prüfung da! 💇🔥',
  'Ich bin so spezialisiert wie a Nürnberger Rostbratwurst — nur eins, aber des richtig: Feuerwehr! 🌭 Frag mich was zum MTA-Stoff!',
  'Drei Sachen kann der Franke: Bratwurst, Bier und Feuerwehr. Und nur zum Dritten kann ich was sagen. Also — MTA-Frage her!',
  'Ich hab des grad mal im Lehrmaterial gsucht... zwischen Brandklassen und Atemschutz... nix gfunden. Komisch! 😄 Frag mich lieber was zur MTA-Prüfung!',
  'Also wenn ich des wüsst, wär ich Philosophie-Professor und ned bei der Feuerwehr. Frag mich was wo brennt — MTA-Themen!',
  'Wenns nach mir ging, würd ich dir helfen. Aber mei Dienstvorschrift sagt: nur MTA-Prüfung. Und gegen die Dienstvorschrift geht nix! Frag was zum Lehrmaterial! 😤',
  'Des steht weder im C-Rohr noch im D-Rohr. Probier\'s mal mit einer MTA-Frage — da spritzt die Antwort nur so raus! 💦',
  'Des weiß ned amol der Hydrant — und der steht den ganzen Tag draußen rum und hört alles. Frag mich lieber was zur MTA-Prüfung!',
  'Bei uns in Franken sagt mer: "Wer nichts weiß, muss alles glauben." Also frag mich schnell was zum MTA-Stoff, bevor\'d was Falsches glaubst!',
  'Des hat mit Feuerwehr so viel zu tun wie a Fisch mit\'m Fahrrad. Aber a MTA-Frage? Da bin ich heißer drauf als a Vollbrand! 🔥',
];

export function buildRefusalResponse(): string {
  return FUNNY_REFUSALS[Math.floor(Math.random() * FUNNY_REFUSALS.length)];
}
