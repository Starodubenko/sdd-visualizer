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

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={theme === 'light'}
        onClick={() => choose('light')}
      >
        Светлая
      </button>
      <button
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => choose('dark')}
      >
        Тёмная
      </button>
    </>
  );
};
