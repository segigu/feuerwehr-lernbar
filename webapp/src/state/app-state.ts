const LANGUAGE_KEY = 'mta-language';

export type Language = 'de' | 'de+ru';

export function getLanguage(): Language {
  try {
    const val = localStorage.getItem(LANGUAGE_KEY);
    return val === 'de+ru' ? 'de+ru' : 'de';
  } catch {
    return 'de';
  }
}

export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
}

export function toggleLanguage(): Language {
  const current = getLanguage();
  const next: Language = current === 'de' ? 'de+ru' : 'de';
  setLanguage(next);
  return next;
}
