import { BackButton } from '../shared/BackButton'
import { useLanguage } from '../../i18n/LanguageContext'
import { ui } from '../../i18n/strings'

interface SystemAnimationProps {
  onBack: () => void
}

export function SystemAnimation({ onBack }: SystemAnimationProps) {
  const { t } = useLanguage()

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <BackButton onBack={onBack} />
        <h2 className="text-kiosk-xl font-display text-museum-dark">
          {t(ui.featureAnimation)}
        </h2>
        <div className="w-32" />
      </div>

      {/* Animation area */}
      <div className="flex-1 mx-8 mb-8 bg-museum-warm rounded-lg flex items-center justify-center">
        <div className="text-center text-museum-accent">
          <p className="text-kiosk-lg mb-4">[System Animation]</p>
          <p className="text-kiosk-base">
            Coal → Boilers → Steam → Engines → Pumps → Harbour
          </p>
          <p className="text-kiosk-xl font-display mt-8">
            {t(ui.pumpCapacity)}
          </p>
        </div>
      </div>

      {/* Playback controls */}
      <div className="bg-museum-dark px-8 py-6">
        <div className="flex justify-center gap-4">
          <button className="px-8 py-4 bg-museum-highlight text-museum-dark rounded-full text-kiosk-base font-semibold touch-target">
            {t(ui.play)}
          </button>
          <button className="px-8 py-4 bg-museum-stone/20 text-museum-stone rounded-full text-kiosk-base font-semibold touch-target">
            {t(ui.restart)}
          </button>
        </div>
      </div>
    </div>
  )
}
