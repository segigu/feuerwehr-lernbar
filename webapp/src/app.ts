import { renderHome } from './screens/home';
import { renderTopicSelect } from './screens/topic-select';
import { renderQuiz } from './screens/quiz';
import { renderResults } from './screens/results';
import { renderReview } from './screens/review';
import { hideMainButton, hideBackButton } from './utils/telegram';

export type Screen = 'home' | 'topic-select' | 'quiz' | 'results' | 'review';

type CleanupFn = () => void;

let currentCleanup: CleanupFn | null = null;
let container: HTMLElement;

export function initApp(root: HTMLElement): void {
  container = root;
  navigate('home');
}

export function navigate(screen: Screen, _params?: unknown): void {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

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
  }
}
