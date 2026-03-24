import { h } from '../utils/dom';

const DISMISSED_KEY = 'pwa-install-dismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

function isTelegram(): boolean {
  return !!window.Telegram?.WebApp;
}

function getOS(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export function createInstallBanner(): HTMLElement | null {
  // Don't show if already installed, inside Telegram, or dismissed
  if (isStandalone() || isTelegram()) return null;
  if (sessionStorage.getItem(DISMISSED_KEY)) return null;

  const os = getOS();
  if (os === 'other') return null;

  const banner = h('div', { className: 'install-banner' });

  const closeBtn = h('button', { className: 'install-banner-close' }, '\u2715');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sessionStorage.setItem(DISMISSED_KEY, '1');
    banner.remove();
  });

  const icon = h('img', { className: 'install-banner-icon' }) as HTMLImageElement;
  icon.src = `${import.meta.env.BASE_URL}icons/icon-192.png`;
  icon.alt = '';

  const textCol = h('div', { className: 'install-banner-text' });
  const title = h('div', { className: 'install-banner-title' }, 'App installieren');

  const steps = h('div', { className: 'install-banner-steps' });

  if (os === 'ios') {
    steps.innerHTML =
      '<span class="install-step">1. Tippe auf <b>Teilen</b> <span class="install-icon-share">&#xEE95;</span></span>' +
      '<span class="install-step">2. <b>Zum Home-Bildschirm</b></span>';
  } else {
    steps.innerHTML =
      '<span class="install-step">1. Tippe auf <b>\u22EE</b> (Menü)</span>' +
      '<span class="install-step">2. <b>App installieren</b></span>';
  }

  textCol.append(title, steps);
  banner.append(closeBtn, icon, textCol);

  return banner;
}
