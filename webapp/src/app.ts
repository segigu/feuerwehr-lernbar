import { renderHome } from './screens/home';
import { renderTopicSelect } from './screens/topic-select';
import { renderQuiz } from './screens/quiz';
import { renderResults } from './screens/results';
import { renderReview } from './screens/review';
import { renderLessons } from './screens/lessons';
import { renderLessonDetail } from './screens/lesson-detail';
import { renderLearn } from './screens/learn';
import { renderVocab } from './screens/vocab';
import { renderAssistant } from './screens/assistant';
import { hideMainButton, hideBackButton } from './utils/telegram';
import { toggleLanguage } from './state/app-state';
import { showToast } from './utils/toast';
import { migrateProgressV2 } from './state/lesson-state';

export type Screen =
  | 'home'
  | 'topic-select'
  | 'quiz'
  | 'results'
  | 'review'
  | 'lessons'
  | 'lesson-detail'
  | 'learn'
  | 'vocab'
  | 'assistant';

export interface NavigationParams {
  lessonId?: string;
  vocabDirection?: 'de-ru' | 'ru-de' | 'mix';
  sectionId?: string;
  fromQuiz?: boolean;
  fromAssistant?: boolean;
}

type CleanupFn = () => void;

let currentCleanup: CleanupFn | null = null;
let currentParams: NavigationParams | null = null;
let container: HTMLElement;

export function getNavigationParams(): NavigationParams | null {
  return currentParams;
}

export function initApp(root: HTMLElement): void {
  container = root;
  migrateProgressV2();

  // Secret 7-tap language toggle — each tap must be within 400ms of the previous
  let tapCount = 0;
  let lastTapTime = 0;
  document.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTapTime > 400) tapCount = 0;
    lastTapTime = now;
    tapCount++;
    if (tapCount >= 7) {
      tapCount = 0;
      const newLang = toggleLanguage();
      showToast(newLang === 'de+ru' ? 'DE + RU aktiviert' : 'Nur Deutsch');
    }
  });

  navigate('home');
}

export function navigate(screen: Screen, params?: NavigationParams): void {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  currentParams = params ?? null;

  hideMainButton();
  hideBackButton();

  container.innerHTML = '';

  const screenEl = document.createElement('div');
  screenEl.className = `screen screen-${screen}`;
  container.appendChild(screenEl);

  requestAnimationFrame(() => {
    screenEl.classList.add('screen-enter-active');
  });

  switch (screen) {
    case 'home':
      currentCleanup = renderHome(screenEl);
      break;
    case 'topic-select':
      currentCleanup = renderTopicSelect(screenEl);
      break;
    case 'quiz':
      currentCleanup = renderQuiz(screenEl);
      break;
    case 'results':
      currentCleanup = renderResults(screenEl);
      break;
    case 'review':
      currentCleanup = renderReview(screenEl);
      break;
    case 'lessons':
      currentCleanup = renderLessons(screenEl);
      break;
    case 'lesson-detail':
      currentCleanup = renderLessonDetail(screenEl);
      break;
    case 'learn':
      currentCleanup = renderLearn(screenEl);
      break;
    case 'vocab':
      currentCleanup = renderVocab(screenEl);
      break;
    case 'assistant':
      currentCleanup = renderAssistant(screenEl);
      break;
  }
}
