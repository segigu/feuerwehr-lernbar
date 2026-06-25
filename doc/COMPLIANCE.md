# Datenschutz-Compliance — interne Notiz

Kurze Belegsammlung für den Betreiber (Privatperson, nicht-kommerziell). Kein
Vertrag, keine Rechtsberatung — nur Nachweis, dass die Auftragsverarbeiter (AVV/DPA)
und ihre Drittland-Garantien vorhanden sind und worauf man sich beruft.

## Auftragsverarbeiter (Sub-Processors)

| Dienst | Rolle | AVV / DPA | Drittland-Garantie |
|--------|-------|-----------|--------------------|
| **Cloudflare, Inc.** | Workers AI (KI-Ausbilder, Whisper-Transkription), Vectorize | [Cloudflare Customer DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) | SCC + EU-US Data Privacy Framework |
| **GitHub, Inc.** (Microsoft) | Hosting der PWA via GitHub Pages (Server-Logs, IP) | [GitHub Data Protection Agreement](https://github.com/customer-terms/github-data-protection-agreement) | SCC + EU-US Data Privacy Framework |

## Wichtig zu verstehen

- Als **Self-Serve- / kostenloser Account** muss man **nichts unterschreiben**.
  Das DPA ist automatisch Bestandteil der bei der Registrierung akzeptierten
  Nutzungsbedingungen und gilt kraft Vertrags. Die Standardvertragsklauseln (SCC)
  für die USA-Übermittlung sind darin bereits enthalten.
- Man muss das DPA nur **belegen / verlinken können** — genau das leisten die obigen
  Links. Sie sind auch in der Datenschutzerklärung der App referenziert
  (`webapp/src/screens/legal.ts`, Abschnitte 3 und 5).

## Was tatsächlich verarbeitet wird (Datenminimierung)

- **Keine** Benutzerkonten, keine Registrierung, kein Login.
- Lernfortschritt nur lokal im Browser (`localStorage`), verlässt das Gerät nicht.
- Q&A-Fragen und Sprachaufnahmen gehen **transient** an Cloudflare Workers AI:
  nur zur Beantwortung, keine Speicherung, kein Modell-Training.
- Keine Cookies zu Tracking-/Werbezwecken, keine Analyse-Tools.
- Server-Logs (IP) bei Cloudflare/GitHub technisch notwendig, Art. 6 Abs. 1 lit. f.

## Offene Punkte (vor öffentlichem Launch)

- [ ] Verantwortlichen in `legal.ts` eintragen (Name, Anschrift, E-Mail — derzeit Platzhalter).
- [ ] Bei großer Reichweite: einmalige Prüfung durch Datenschutz-Juristen.
- [ ] Optional: KI-Inferenz auf EU-Region pinnen, um USA-Transfer ganz zu vermeiden.

Stand: Juni 2026.
