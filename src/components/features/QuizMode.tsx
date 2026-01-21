import { BackButton } from '../shared/BackButton'
import { useLanguage } from '../../i18n/LanguageContext'
import { ui } from '../../i18n/strings'

interface QuizModeProps {
  onBack: () => void
}

export function QuizMode({ onBack }: QuizModeProps) {
  const { t } = useLanguage()

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <BackButton onBack={onBack} />
        <h2 className="text-kiosk-xl font-display text-museum-dark">
          {t(ui.featureQuiz)}
        </h2>
        <div className="px-6 py-2 bg-museum-highlight rounded-full text-museum-dark font-semibold">
          {t(ui.quizScore)}: 0/5
        </div>
      </div>

      {/* Quiz area */}
      <div className="flex-1 mx-8 mb-8 bg-museum-warm rounded-lg flex items-center justify-center">
        <div className="text-center text-museum-accent">
          <p className="text-kiosk-xl mb-8">
            "Which pump moved 14,000 gallons per minute?"
          </p>
          <p className="text-kiosk-base">
            [Touch the correct equipment on the image above]
          </p>
        </div>
      </div>
    </div>
  )
}
