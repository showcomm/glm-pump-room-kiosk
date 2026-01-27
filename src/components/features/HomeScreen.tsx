import { Feature } from '../../App'
import { useLanguage } from '../../i18n/LanguageContext'
import { ui } from '../../i18n/strings'

interface HomeScreenProps {
  onSelectFeature: (feature: Feature) => void
}

export function HomeScreen({ onSelectFeature }: HomeScreenProps) {
  const { t } = useLanguage()

  const features: Array<{ id: Feature; label: typeof ui.featureExplore; icon: string }> = [
    { id: 'explore', label: ui.featureExplore, icon: '🔍' },
    { id: 'animation', label: ui.featureAnimation, icon: '▶️' },
    { id: 'cutaway', label: ui.featureCutaway, icon: '🏛️' },
    { id: 'quiz', label: ui.featureQuiz, icon: '❓' },
    { id: 'gallery', label: ui.featureGallery, icon: '📷' },
  ]

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <h1 className="text-kiosk-2xl font-display text-museum-dark">
          {t(ui.welcome)}
        </h1>
        <p className="text-kiosk-base text-museum-accent mt-2">
          {t(ui.touchPrompt)}
        </p>
      </div>

      {/* Main image area - placeholder for pump room photo */}
      <div className="flex-1 relative mx-8 mb-4">
        <div className="absolute inset-0 bg-museum-warm rounded-lg flex items-center justify-center">
          <div className="text-museum-accent text-kiosk-lg">
            {/* Pump room master image will go here */}
            [Pump Room Image - 2732x2048]
          </div>
        </div>
        
        {/* Hotspots will overlay here */}
      </div>

      {/* Feature navigation bar */}
      <div className="bg-museum-dark px-8 py-6">
        <div className="flex justify-center gap-4">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onSelectFeature(feature.id)}
              className="flex flex-col items-center gap-2 px-6 py-4 bg-museum-stone/10 hover:bg-museum-stone/20 rounded-lg transition-colors touch-target"
            >
              <span className="text-3xl">{feature.icon}</span>
              <span className="text-kiosk-sm text-museum-stone font-body">
                {t(feature.label)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
