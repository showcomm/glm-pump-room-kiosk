import { BackButton } from '../shared/BackButton'
import { useLanguage } from '../../i18n/LanguageContext'
import { ui } from '../../i18n/strings'

interface BuildingCutawayProps {
  onBack: () => void
}

export function BuildingCutaway({ onBack }: BuildingCutawayProps) {
  const { t } = useLanguage()

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <BackButton onBack={onBack} />
        <h2 className="text-kiosk-xl font-display text-museum-dark">
          {t(ui.featureCutaway)}
        </h2>
        <div className="w-32" />
      </div>

      {/* Cutaway illustration area */}
      <div className="flex-1 mx-8 mb-8 bg-museum-warm rounded-lg flex items-center justify-center">
        <div className="text-center text-museum-accent">
          <p className="text-kiosk-lg mb-4">[Building Cross-Section Illustration]</p>
          <p className="text-kiosk-base">
            Coal Pile → Boiler Room → Engine Room → Pump Well → Dry Dock
          </p>
        </div>
      </div>
    </div>
  )
}
