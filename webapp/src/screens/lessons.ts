import { navigate } from '../app';
import { lessons, extractVocab } from '../data/lessons';
import { getLessonLearnProgress, getLessonQuizStats } from '../state/lesson-state';
import { showBackButton } from '../utils/telegram';
import { h } from '../utils/dom';

const BASE = import.meta.env.BASE_URL;

const lessonImages: Record<string, string> = {
  'rechtsgrundlagen': 'Rechtsgrundlagen.png',
  'brennen-loeschen': 'Brennen und L\u00F6schen.png',
  'fahrzeugkunde': 'Fahrzeugkunde.png',
  'persoenliche-ausruestung': 'Pers\u00F6nliche Ausr\u00FCstung.png',
  'schlaeuche-armaturen': 'Ger\u00E4te und Armaturen.png',
  'hilfeleistungsgeraete': 'Technische Hilfeleistung.png',
  'rettungsgeraete': 'Rettung, Leitern und Knoten.png',
  'belastungen': 'Belastungen.png',
  'verhalten-einsatz': 'Verhalten.png',
  'hygiene': 'Erste Hilfe.png',
  'verhalten-gefahr': 'Gefahr.png',
  'loescheinsatz': 'L\u00F6scheinsatz FwDV3.png',
  'absturzsicherung': 'Absturzsicherung.png',
  'hilfeleistungseinsatz': 'Einheiten.png',
  'abc-gefahrstoffe': 'ABC.png',
  'erste-hilfe': 'Erste Hilfe.png',
  'sprechfunk': 'Sprechfunk.png',
};

export function renderLessons(container: HTMLElement): () => void {
  const backLink = h('button', { className: 'back-link' }, '\u2190 Startseite');
  backLink.addEventListener('click', () => navigate('home'));
  container.appendChild(backLink);

  const header = h('div', { className: 'home-header' });
  const title = h('h1', { className: 'home-title' }, 'Unterricht');
  header.append(title);
  container.appendChild(header);

  const grid = h('div', { className: 'topic-grid' });

  for (const lesson of lessons) {
    const card = h('button', { className: 'topic-card' });

    // Thumbnail image
    const imgFile = lessonImages[lesson.id];
    if (imgFile) {
      const thumb = h('img', { className: 'lesson-thumb', src: `${BASE}images/${imgFile}`, alt: '' });
      card.appendChild(thumb);
    }

    const left = h('div', { className: 'lesson-card-left' });
    const name = h('span', { className: 'topic-name' }, lesson.title);
    left.appendChild(name);

    // Chapter number
    if (lesson.chapters.length > 0) {
      const chapText = lesson.chapters[0] === 'E'
        ? 'Ergänzungsmodul'
        : `Kap. ${lesson.chapters.join(' / ')}`;
      const chap = h('span', { className: 'lesson-card-chapter' }, chapText);
      left.appendChild(chap);
    } else if (lesson.id === 'erste-hilfe') {
      const chap = h('span', { className: 'lesson-card-chapter' }, 'Zusatzthema');
      left.appendChild(chap);
    }

    // Progress info
    const stats = getLessonQuizStats(lesson.id);
    const learnProgress = getLessonLearnProgress(lesson.id);
    const vocabCount = extractVocab(lesson).length;

    const infoItems: string[] = [];
    infoItems.push(`${lesson.questions.length} Fragen`);
    if (vocabCount > 0 && lesson.ready) {
      infoItems.push(`${vocabCount} Vokabeln`);
    }

    const info = h('span', { className: 'lesson-card-info' }, infoItems.join(' \u00B7 '));
    left.appendChild(info);

    card.appendChild(left);

    // Right side: status badge
    const right = h('div', { className: 'lesson-card-right' });
    if (stats) {
      const pct = Math.round((stats.correct / (stats.correct + stats.wrong)) * 100);
      const badge = h('span', { className: 'lesson-badge' }, `${pct}%`);
      right.appendChild(badge);
    } else if (learnProgress.completedSections.length > 0) {
      const badge = h('span', { className: 'lesson-badge lesson-badge-progress' }, '\u2022\u2022\u2022');
      right.appendChild(badge);
    }

    if (!lesson.ready) {
      const wip = h('span', { className: 'lesson-badge lesson-badge-wip' }, 'In Arbeit');
      right.appendChild(wip);
    }

    card.appendChild(right);

    card.addEventListener('click', () => {
      navigate('lesson-detail', { lessonId: lesson.id });
    });

    grid.appendChild(card);
  }

  container.appendChild(grid);

  const cleanupBack = showBackButton(() => navigate('home'));
  return () => { cleanupBack(); };
}
