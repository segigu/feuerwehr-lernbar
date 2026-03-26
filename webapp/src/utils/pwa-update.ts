import { registerSW } from 'virtual:pwa-register';
import { h } from './dom';

export function initPWAUpdate(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateBanner(updateSW);
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => { registration.update(); }, 60 * 60 * 1000);
      }
    },
  });
}

function showUpdateBanner(updateSW: (reloadPage?: boolean) => Promise<void>): void {
  if (document.querySelector('.update-banner')) return;

  const banner = h('div', { className: 'update-banner' });
  const text = h('span', { className: 'update-banner-text' }, 'Neue Version verfügbar');

  const updateBtn = h('button', { className: 'update-banner-btn' }, 'Aktualisieren');
  updateBtn.addEventListener('click', () => {
    updateBtn.textContent = 'Lädt…';
    updateBtn.setAttribute('disabled', '');
    updateSW(true);
  });

  const closeBtn = h('button', { className: 'update-banner-close' }, '\u2715');
  closeBtn.addEventListener('click', () => {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 300);
  });

  banner.append(text, updateBtn, closeBtn);
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('visible'));
}
