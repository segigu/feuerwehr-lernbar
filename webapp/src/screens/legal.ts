import { navigate } from '../app';
import { showBackButton } from '../utils/telegram';
import { h } from '../utils/dom';

// Datenschutzerklärung + Impressum for the standalone PWA.
// Placeholders in [eckigen Klammern] MUST be filled with the real
// responsible person's details before going public.

function section(title: string, ...nodes: Node[]): HTMLElement {
  const sec = h('section', { className: 'legal-section' });
  sec.appendChild(h('h2', { className: 'legal-heading' }, title));
  for (const n of nodes) sec.appendChild(n);
  return sec;
}

function p(...children: (string | Node)[]): HTMLElement {
  return h('p', { className: 'legal-para' }, ...children);
}

function ph(text: string): HTMLElement {
  // Visible placeholder — replace before publishing
  return h('span', { className: 'legal-placeholder' }, text);
}

function ul(...items: (string | Node)[]): HTMLElement {
  const list = h('ul', { className: 'legal-list' });
  for (const it of items) list.appendChild(h('li', null, it));
  return list;
}

function a(text: string, href: string): HTMLElement {
  return h('a', { className: 'legal-link', href, target: '_blank', rel: 'noopener' }, text);
}

export function renderLegal(container: HTMLElement): () => void {
  const backLink = h('button', { className: 'back-link' }, '← Zurück');
  backLink.addEventListener('click', () => navigate('home'));
  container.appendChild(backLink);

  const title = h('h1', { className: 'screen-title legal-title' }, 'Datenschutz & Impressum');
  container.appendChild(title);

  const content = h('div', { className: 'legal-content' });

  // ── Datenschutzerklärung ────────────────────────────────────
  content.appendChild(h('h1', { className: 'legal-doc-title' }, 'Datenschutzerklärung'));

  content.appendChild(section(
    '1. Verantwortlicher',
    p('Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:'),
    p(ph('[Name / Verantwortliche Person]')),
    p(ph('[Anschrift]')),
    p('E-Mail: ', ph('[E-Mail-Adresse]')),
  ));

  content.appendChild(section(
    '2. Überblick',
    p('Der MTA Prüfungstrainer ist eine Progressive Web App (PWA) zur Vorbereitung auf die MTA-Zwischenprüfung. Es gibt keine Benutzerkonten, keine Registrierung und keine Anmeldung. Wir verarbeiten so wenige personenbezogene Daten wie möglich.'),
  ));

  content.appendChild(section(
    '3. Hosting (GitHub Pages)',
    p('Die App wird über GitHub Pages (GitHub, Inc., USA) bereitgestellt. Beim Aufruf der Seite verarbeitet GitHub technisch notwendige Server-Logdaten, insbesondere die IP-Adresse, Datum und Uhrzeit des Zugriffs sowie Browser- und Geräteangaben (User-Agent).'),
    p('Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren und stabilen Betrieb). Eine Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln bzw. des EU-US Data Privacy Framework.'),
    p('Auftragsverarbeitung: ', a('GitHub Data Protection Agreement', 'https://github.com/customer-terms/github-data-protection-agreement')),
  ));

  content.appendChild(section(
    '4. Lokale Speicherung auf deinem Gerät',
    p('Dein Lernfortschritt (beantwortete Fragen, markierte Fehler, Spracheinstellung) wird ausschließlich lokal in deinem Browser gespeichert (localStorage). Diese Daten verlassen dein Gerät nicht und werden nicht an uns oder Dritte übertragen.'),
    p('Du kannst diese Daten jederzeit über die Einstellungen deines Browsers löschen. Es werden keine Cookies zu Analyse- oder Werbezwecken gesetzt.'),
  ));

  content.appendChild(section(
    '5. KI-Ausbilder (Frage-Antwort-Funktion)',
    p('Wenn du den KI-Ausbilder nutzt, wird deine eingegebene Frage an Cloudflare Workers AI (Cloudflare, Inc.) übermittelt, dort verarbeitet und beantwortet. Die Frage wird ausschließlich zur Erzeugung der Antwort verwendet, nicht dauerhaft gespeichert und nicht zum Training von KI-Modellen genutzt.'),
    p('Cloudflare ist dabei als Auftragsverarbeiter tätig. Es kann zu einer Übermittlung in die USA kommen (Standardvertragsklauseln / Data Privacy Framework). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung deiner Lernfragen).'),
    p('Auftragsverarbeitung: ', a('Cloudflare Customer DPA', 'https://www.cloudflare.com/cloudflare-customer-dpa/')),
  ));

  content.appendChild(section(
    '6. Sprachnachrichten und Mikrofon',
    p('Für Sprachfragen greift die App nur während einer aktiven Aufnahme auf dein Mikrofon zu – erst nach deiner ausdrücklichen Freigabe im Browser. Die Aufnahme wird zur Transkription an Cloudflare Workers AI (Modell Whisper) übermittelt, in Text umgewandelt und anschließend wie eine Textfrage verarbeitet. Die Audiodaten werden nicht dauerhaft gespeichert.'),
  ));

  content.appendChild(section(
    '7. Kein Tracking, keine Weitergabe',
    p('Es werden keine Tracking-, Analyse- oder Werbe-Tools eingesetzt. Deine Daten werden nicht zu Werbezwecken weitergegeben.'),
  ));

  content.appendChild(section(
    '8. Deine Rechte',
    p('Dir stehen nach der DSGVO folgende Rechte zu:'),
    ul(
      'Auskunft über die zu dir gespeicherten Daten (Art. 15)',
      'Berichtigung unrichtiger Daten (Art. 16)',
      'Löschung (Art. 17)',
      'Einschränkung der Verarbeitung (Art. 18)',
      'Datenübertragbarkeit (Art. 20)',
      'Widerspruch gegen die Verarbeitung (Art. 21)',
    ),
    p('Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zur Ausübung deiner Rechte genügt eine formlose Nachricht an die oben genannte Kontaktadresse.'),
  ));

  content.appendChild(section(
    '9. Stand',
    p('Stand dieser Datenschutzerklärung: Juni 2026.'),
  ));

  // ── Impressum ───────────────────────────────────────────────
  content.appendChild(h('h1', { className: 'legal-doc-title legal-doc-title-spaced' }, 'Impressum'));

  content.appendChild(section(
    'Angaben gemäß § 5 DDG',
    p(ph('[Name / Verantwortliche Person]')),
    p(ph('[Straße und Hausnummer]')),
    p(ph('[PLZ und Ort]')),
    p('Kontakt – E-Mail: ', ph('[E-Mail-Adresse]')),
    p('Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: ', ph('[Name]')),
  ));

  content.appendChild(section(
    'Hinweis',
    p('Dies ist ein privates, nicht-kommerzielles Lernprojekt und kein offizielles Angebot der Staatlichen Feuerwehrschule Würzburg.'),
  ));

  container.appendChild(content);

  const cleanupBack = showBackButton(() => navigate('home'));
  return () => { cleanupBack(); };
}
