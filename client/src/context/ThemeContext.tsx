import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'forest-light' | 'clean-air' | 'midnight-eco';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  previewColors: [string, string, string]; // [primary/brand, accent, surface/bg]
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'forest-light',
    name: 'Forest Light',
    tagline: 'Light background, botanical green accents, clean white cards',
    previewColors: ['#1b4332', '#52b788', '#f8faf7'],
  },
  {
    id: 'clean-air',
    name: 'Clean Air',
    tagline: 'Bright neutral background, soft sky-blue and green accents',
    previewColors: ['#0284c7', '#10b981', '#f0f7fb'],
  },
  {
    id: 'midnight-eco',
    name: 'Midnight Eco',
    tagline: 'Dark forest-inspired surfaces with light text and accessible contrast',
    previewColors: ['#10b981', '#34d399', '#0a1410'],
  },
];

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

const THEME_STORAGE_KEY = 'airpulse-theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'forest-light',
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'forest-light' || saved === 'clean-air' || saved === 'midnight-eco') {
        return saved;
      }
    } catch {
      // ignore localStorage error
    }
    return 'forest-light';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
