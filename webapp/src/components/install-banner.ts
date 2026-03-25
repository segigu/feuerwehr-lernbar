import { h } from '../utils/dom';

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

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

function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = new Date(raw).getTime();
  const sevenDays = DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return (Date.now() - dismissedAt) < sevenDays;
}

export function showInstallBanner(): () => void {
  if (isStandalone() || isTelegram()) return () => {};
  if (getOS() === 'other') return () => {};
  if (isDismissedRecently()) return () => {};
  if (document.querySelector('.install-sheet')) return () => {};

  let backdrop: HTMLElement | null = null;
  let sheet: HTMLElement | null = null;

  const timerId = setTimeout(() => {
    const os = getOS();

    backdrop = h('div', { className: 'install-backdrop' });
    sheet = h('div', { className: 'install-sheet' });

    const handle = h('div', { className: 'install-sheet-handle' });

    const header = h('div', { className: 'install-sheet-header' });
    const icon = h('img', { className: 'install-sheet-icon' }) as HTMLImageElement;
    icon.src = `${import.meta.env.BASE_URL}icons/icon-192.png`;
    icon.alt = '';
    const title = h('div', { className: 'install-sheet-title' }, 'App installieren');
    const closeBtn = h('button', { className: 'install-sheet-close' }, '\u2715');
    header.append(icon, title, closeBtn);

    const desc = h('p', { className: 'install-sheet-desc' },
      'Schneller Zugriff, funktioniert offline \u2014 direkt vom Startbildschirm.');

    const steps = h('div', { className: 'install-sheet-steps' });

    if (os === 'ios') {
      const step1 = h('div', { className: 'install-sheet-step' });
      step1.append(
        h('span', { className: 'install-sheet-step-num' }, '1'),
        h('span', {})
      );
      step1.lastElementChild!.innerHTML = 'Tippe auf <b>Teilen</b> (Quadrat mit Pfeil) unten in Safari';

      const step2 = h('div', { className: 'install-sheet-step' });
      step2.append(
        h('span', { className: 'install-sheet-step-num' }, '2'),
        h('span', {})
      );
      step2.lastElementChild!.innerHTML = 'W\u00e4hle <b>Zum Home\u2011Bildschirm</b>';

      steps.append(step1, step2);
    } else {
      const step1 = h('div', { className: 'install-sheet-step' });
      step1.append(
        h('span', { className: 'install-sheet-step-num' }, '1'),
        h('span', {})
      );
      step1.lastElementChild!.innerHTML = 'Tippe auf <b>\u22EE</b> (Men\u00fc) oben rechts';

      const step2 = h('div', { className: 'install-sheet-step' });
      step2.append(
        h('span', { className: 'install-sheet-step-num' }, '2'),
        h('span', {})
      );
      step2.lastElementChild!.innerHTML = 'W\u00e4hle <b>App installieren</b>';

      steps.append(step1, step2);
    }

    const dismissBtn = h('button', { className: 'install-sheet-dismiss' }, 'Nicht jetzt');

    sheet.append(handle, header, desc, steps, dismissBtn);

    function dismiss() {
      localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
      backdrop?.classList.remove('visible');
      sheet?.classList.remove('visible');
      document.body.style.overflow = '';
      setTimeout(() => {
        backdrop?.remove();
        sheet?.remove();
        backdrop = null;
        sheet = null;
      }, 300);
    }

    closeBtn.addEventListener('click', dismiss);
    dismissBtn.addEventListener('click', dismiss);
    backdrop.addEventListener('click', dismiss);

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      backdrop?.classList.add('visible');
      sheet?.classList.add('visible');
    });
  }, 1500);

  return () => {
    clearTimeout(timerId);
    document.body.style.overflow = '';
    backdrop?.remove();
    sheet?.remove();
  };
}
