import { navigate, getNavigationParams } from '../app';
import { getLessonById } from '../data/lessons';
import type { Block } from '../data/lessons';
import { getLessonLearnProgress, markSectionComplete } from '../state/lesson-state';
import { getLanguage } from '../state/app-state';
import { showBackButton, closeMiniApp } from '../utils/telegram';
import { h, clear, createImg } from '../utils/dom';

const BASE = import.meta.env.BASE_URL;

export function renderLearn(container: HTMLElement): () => void {
  const params = getNavigationParams();
  const lesson = params?.lessonId ? getLessonById(params.lessonId) : undefined;

  if (!lesson) {
    navigate('lessons');
    return () => {};
  }

  const lang = getLanguage();
  const sections = lesson.sections;

  // Find initial section (from params or first)
  let currentSectionIdx = 0;
  if (params?.sectionId) {
    const idx = sections.findIndex(s => s.id === params.sectionId);
    if (idx >= 0) currentSectionIdx = idx;
  }

  const fromQuiz = params?.fromQuiz === true;
  const fromDeepLink = params?.fromDeepLink === true;

  if (!fromDeepLink) {
    const goBack = () => fromQuiz ? navigate('quiz') : navigate('lesson-detail', { lessonId: lesson.id });
    const backLink = h('button', { className: 'back-link' }, fromQuiz ? '\u2190 Zur\u00FCck zum Quiz' : '\u2190 ' + lesson.title);
    backLink.addEventListener('click', goBack);
    container.appendChild(backLink);
  }

  // Section chips
  const chipsRow = h('div', { className: 'section-chips' });
  const contentArea = h('div', { className: 'learn-content' });

  container.append(chipsRow, contentArea);

  function renderChips(): void {
    clear(chipsRow);
    const progress = getLessonLearnProgress(lesson!.id);

    sections.forEach((section, idx) => {
      const isActive = idx === currentSectionIdx;
      const isDone = progress.completedSections.includes(section.id);
      const classes = ['section-chip'];
      if (isActive) classes.push('active');
      if (isDone) classes.push('done');

      const chip = h('button', { className: classes.join(' ') }, section.title);
      chip.addEventListener('click', () => {
        currentSectionIdx = idx;
        renderSection();
        renderChips();
        chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      chipsRow.appendChild(chip);
    });

    // Scroll active chip into view
    const activeChip = chipsRow.querySelector('.section-chip.active');
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  function renderSection(): void {
    clear(contentArea);
    const section = sections[currentSectionIdx];

    // Section title
    const titleEl = h('h2', { className: 'learn-section-title' }, section.title);
    contentArea.appendChild(titleEl);

    if (lang === 'de+ru' && section.titleRu) {
      const titleRu = h('p', { className: 'learn-section-title-ru' }, section.titleRu);
      contentArea.appendChild(titleRu);
    }

    // Blocks
    for (const block of section.blocks) {
      contentArea.appendChild(renderBlock(block, lang));
    }

    // Complete button
    const progress = getLessonLearnProgress(lesson!.id);
    const isCompleted = progress.completedSections.includes(section.id);

    if (!isCompleted) {
      const completeBtn = h('button', { className: 'action-btn action-secondary learn-complete-btn' }, 'Abschnitt abgeschlossen \u2713');
      completeBtn.addEventListener('click', () => {
        markSectionComplete(lesson!.id, section.id);
        completeBtn.textContent = 'Abgeschlossen \u2713';
        completeBtn.classList.add('completed');
        completeBtn.disabled = true;
        renderChips();

        // Auto-advance to next section
        if (currentSectionIdx < sections.length - 1) {
          setTimeout(() => {
            currentSectionIdx++;
            renderSection();
            renderChips();
          }, 600);
        }
      });
      contentArea.appendChild(completeBtn);
    } else {
      const doneBadge = h('div', { className: 'learn-done-badge' }, 'Abgeschlossen \u2713');
      contentArea.appendChild(doneBadge);
    }

    // Navigation buttons
    const navRow = h('div', { className: 'learn-nav-row' });

    if (currentSectionIdx > 0) {
      const prevBtn = h('button', { className: 'action-btn action-secondary' }, '\u2190 Zur\u00FCck');
      prevBtn.addEventListener('click', () => {
        currentSectionIdx--;
        renderSection();
        renderChips();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      navRow.appendChild(prevBtn);
    }

    if (currentSectionIdx < sections.length - 1) {
      const nextBtn = h('button', { className: 'action-btn action-primary' }, 'Weiter \u2192');
      nextBtn.addEventListener('click', () => {
        currentSectionIdx++;
        renderSection();
        renderChips();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      navRow.appendChild(nextBtn);
    } else {
      const quizBtn = h('button', { className: 'action-btn action-primary' }, 'Zum Quiz \u2192');
      quizBtn.addEventListener('click', () => {
        navigate('lesson-detail', { lessonId: lesson!.id });
      });
      navRow.appendChild(quizBtn);
    }

    contentArea.appendChild(navRow);
  }

  renderChips();
  renderSection();

  const backAction = fromDeepLink ? closeMiniApp : (fromQuiz ? () => navigate('quiz') : () => navigate('lesson-detail', { lessonId: lesson.id }));
  const cleanupBack = showBackButton(backAction);
  return () => { cleanupBack(); };
}

export function renderBlock(block: Block, lang: string): HTMLElement {
  const wrapper = h('div', { className: `learn-block block-${block.type}` });

  switch (block.type) {
    case 'text': {
      const textDe = h('p', { className: 'block-de' });
      textDe.innerHTML = block.de;
      wrapper.appendChild(textDe);
      if (lang === 'de+ru') {
        const textRu = h('p', { className: 'block-ru' });
        textRu.innerHTML = block.ru;
        wrapper.appendChild(textRu);
      }
      break;
    }
    case 'term': {
      // Only show term blocks in bilingual mode (they feed the vocab flashcards)
      if (lang !== 'de+ru') {
        wrapper.style.display = 'none';
        break;
      }
      const termDe = h('strong', { className: 'block-term-de' }, block.de);
      const sep = document.createTextNode(' \u2014 ');
      const termRu = h('span', { className: 'block-term-ru' }, block.ru);
      wrapper.append(termDe, sep, termRu);
      break;
    }
    case 'key': {
      const label = h('strong', { className: 'block-callout-label' }, '\u2714 Merke: ');
      const textDe = h('span', {});
      textDe.innerHTML = block.de;
      wrapper.append(label, textDe);
      if (lang === 'de+ru') {
        const textRu = h('p', { className: 'block-ru' });
        textRu.innerHTML = block.ru;
        wrapper.appendChild(textRu);
      }
      break;
    }
    case 'warn': {
      const label = h('strong', { className: 'block-callout-label' }, '\u26A0 Achtung! ');
      const textDe = h('span', {});
      textDe.innerHTML = block.de;
      wrapper.append(label, textDe);
      if (lang === 'de+ru') {
        const textRu = h('p', { className: 'block-ru' });
        textRu.innerHTML = block.ru;
        wrapper.appendChild(textRu);
      }
      break;
    }
    case 'list': {
      const ul = h('ul', { className: 'block-list' });
      block.items.forEach((item, i) => {
        const li = h('li', { className: 'block-list-item' });
        const de = h('span', { className: 'block-list-de' });
        de.innerHTML = item;
        li.appendChild(de);
        if (lang === 'de+ru' && block.itemsRu?.[i]) {
          const ru = h('span', { className: 'block-list-ru' });
          ru.innerHTML = block.itemsRu[i];
          li.appendChild(ru);
        }
        ul.appendChild(li);
      });
      wrapper.appendChild(ul);
      break;
    }
    case 'table': {
      const bilingualCols = block.bilingualCols ?? [];
      const skipCols = (lang !== 'de+ru') ? new Set(bilingualCols) : new Set<number>();
      const tableEl = h('div', { className: 'block-table-wrap' });
      const table = document.createElement('table');
      table.className = 'block-table';
      if (block.headers.length > 0) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        block.headers.forEach((h2, i) => {
          if (skipCols.has(i)) return;
          const th = document.createElement('th');
          th.textContent = h2;
          tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
      }
      const tbody = document.createElement('tbody');
      block.rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
          if (skipCols.has(i)) return;
          const td = document.createElement('td');
          td.innerHTML = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableEl.appendChild(table);
      wrapper.appendChild(tableEl);
      break;
    }
    case 'image': {
      const img = createImg({
        className: 'block-img',
        src: `${BASE}images/lessons/${block.src}`,
        alt: block.alt ?? '',
      });
      wrapper.appendChild(img);
      if (block.caption) {
        const cap = h('p', { className: 'block-img-caption' });
        cap.innerHTML = block.caption;
        wrapper.appendChild(cap);
        if (lang === 'de+ru' && block.captionRu) {
          const capRu = h('p', { className: 'block-img-caption block-ru' });
          capRu.innerHTML = block.captionRu;
          wrapper.appendChild(capRu);
        }
      }
      break;
    }
  }

  return wrapper;
}
