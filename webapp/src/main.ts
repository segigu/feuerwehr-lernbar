import './styles/variables.css';
import './styles/global.css';
import './styles/components.css';

import { initTelegram, applyTheme } from './utils/telegram';
import { initApp } from './app';

initTelegram();
applyTheme();

const root = document.getElementById('app');
if (root) {
  initApp(root);
}
