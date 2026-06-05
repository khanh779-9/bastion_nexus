import React, { createContext, useContext, useState, createElement } from 'react';
import vi from './vi.json';
import en from './en.json';

interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => void;
  translations: Record<string, any>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, any> = {
  vi,
  en
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const changeLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('language', lang);
    }
  };

  return createElement(
    LanguageContext.Provider,
    { value: { language, changeLanguage, translations } },
    children
  );
}

export function useTranslate() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslate must be used within LanguageProvider');
  }
  
  const { language, translations, changeLanguage } = context;
  const t = (key: string): string => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, language, changeLanguage };
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
