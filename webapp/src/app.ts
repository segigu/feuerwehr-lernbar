import { renderHome } from './screens/home';
import { renderTopicSelect } from './screens/topic-select';
import { renderQuiz } from './screens/quiz';
import { renderResults } from './screens/results';
import { renderReview } from './screens/review';
import { renderLessons } from './screens/lessons';
import { renderLessonDetail } from './screens/lesson-detail';
import { renderLearn } from './screens/learn';
import { renderVocab } from './screens/vocab';
import { hideMainButton, hideBackButton } from './utils/telegram';

export type Screen =
  | 'home'
  | 'topic-select'
  | 'quiz'
  | 'results'
  | 'review'
  | 'lessons'
  | 'lesson-detail'
  | 'learn'
  | 'vocab';

export interface NavigationParams {
  lessonId?: string;
  vocabDirection?: 'de-ru' | 'ru-de' | 'mix';
  sectionId?: string;
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
  }
}
