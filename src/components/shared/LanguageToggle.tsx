import { useLanguage } from '../../i18n/LanguageContext'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex bg-museum-dark/80 rounded-full p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-4 py-2 rounded-full text-kiosk-sm font-semibold transition-colors touch-target ${
          language === 'en'
            ? 'bg-museum-highlight text-museum-dark'
            : 'text-museum-stone hover:text-museum-highlight'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-4 py-2 rounded-full text-kiosk-sm font-semibold transition-colors touch-target ${
          language === 'fr'
            ? 'bg-museum-highlight text-museum-dark'
            : 'text-museum-stone hover:text-museum-highlight'
        }`}
      >
        FR
      </button>
    </div>
  )
}
