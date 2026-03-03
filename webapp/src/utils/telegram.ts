declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
    enable(): void;
    disable(): void;
    setText(text: string): void;
    setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
  };
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  sendData(data: string): void;
}

function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram(): void {
  const webapp = getWebApp();
  if (webapp) {
    webapp.ready();
    webapp.expand();
  }
}

export function isDarkMode(): boolean {
  return getWebApp()?.colorScheme === 'dark';
}

export function showMainButton(text: string, onClick: () => void): () => void {
  const webapp = getWebApp();
  if (!webapp) return () => {};

  webapp.MainButton.setText(text);
  webapp.MainButton.show();
  webapp.MainButton.onClick(onClick);

  return () => {
    webapp.MainButton.offClick(onClick);
    webapp.MainButton.hide();
  };
}

export function hideMainButton(): void {
  getWebApp()?.MainButton.hide();
}

export function showBackButton(onClick: () => void): () => void {
  const webapp = getWebApp();
  if (!webapp) return () => {};

  webapp.BackButton.show();
  webapp.BackButton.onClick(onClick);

  return () => {
    webapp.BackButton.offClick(onClick);
    webapp.BackButton.hide();
  };
}

export function hideBackButton(): void {
  getWebApp()?.BackButton.hide();
}

export function hapticSelection(): void {
  getWebApp()?.HapticFeedback.selectionChanged();
}

export function hapticSuccess(): void {
  getWebApp()?.HapticFeedback.notificationOccurred('success');
}

export function hapticError(): void {
  getWebApp()?.HapticFeedback.notificationOccurred('error');
}

export function applyTheme(): void {
  const dark = isDarkMode();
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
