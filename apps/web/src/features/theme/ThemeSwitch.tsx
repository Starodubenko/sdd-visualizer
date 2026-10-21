import { useEffect, useState, type FC } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sdd-theme';

const applyTheme = (theme: Theme): void => {
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
};

const SunIcon: FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
  >
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M4.22 4.22l1.77 1.77" />
      <path d="M18.01 18.01l1.77 1.77" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="M4.22 19.78l1.77-1.77" />
      <path d="M18.01 5.99l1.77-1.77" />
    </g>
  </svg>
);

const MoonIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.5 3a9 9 0 1 0 8.5 12.2A7 7 0 0 1 12.5 3z" />
  </svg>
);

export const ThemeSwitch: FC = () => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        setTheme(stored);
        applyTheme(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-switch"
      role="switch"
      aria-checked={isDark}
      aria-label="Тёмная тема"
      onClick={toggle}
    >
      <span className="theme-switch-track" aria-hidden>
        <span className="theme-switch-thumb" aria-hidden>
          <span
            className={
              isDark ? 'theme-switch-icon theme-switch-icon--moon' : 'theme-switch-icon theme-switch-icon--sun'
            }
            aria-hidden
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </span>
        </span>
      </span>
    </button>
  );
};
