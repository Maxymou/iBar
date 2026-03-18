import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'auto');
  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const applyTheme = (isDark) => {
      document.documentElement.classList.toggle('dark', isDark);
      setEffectiveTheme(isDark ? 'dark' : 'light');
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches);
      const handler = (e) => applyTheme(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const setAndSave = (value) => {
    setTheme(value);
    localStorage.setItem('theme', value);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme: setAndSave }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
