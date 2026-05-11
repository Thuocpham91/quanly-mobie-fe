import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  return (
    <button 
      onClick={toggleLanguage}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        color: 'var(--primary)',
        fontWeight: '600',
        fontSize: '0.875rem'
      }}
    >
      <Globe size={16} />
      {i18n.language === 'vi' ? 'EN' : 'VI'}
    </button>
  );
};

export default LanguageSwitcher;
