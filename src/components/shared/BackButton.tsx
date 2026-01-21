import { useLanguage } from '../../i18n/LanguageContext'
import { ui } from '../../i18n/strings'

interface BackButtonProps {
  onBack: () => void
}

export function BackButton({ onBack }: BackButtonProps) {
  const { t } = useLanguage()

  return (
    <button
      onClick={onBack}
      className="flex items-center gap-2 px-6 py-3 bg-museum-dark/80 text-museum-stone rounded-full text-kiosk-base font-semibold hover:bg-museum-dark transition-colors touch-target"
    >
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
      {t(ui.back)}
    </button>
  )
}
