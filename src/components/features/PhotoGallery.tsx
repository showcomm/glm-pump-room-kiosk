import { BackButton } from '../shared/BackButton'
import { useLanguage } from '../../i18n/LanguageContext'
import { ui } from '../../i18n/strings'

interface PhotoGalleryProps {
  onBack: () => void
}

export function PhotoGallery({ onBack }: PhotoGalleryProps) {
  const { t } = useLanguage()

  const eras = [
    { id: 'construction', label: { en: 'Construction (1889-1892)', fr: 'Construction (1889-1892)' } },
    { id: 'early', label: { en: 'Early Operation', fr: 'Debut d\'exploitation' } },
    { id: 'wwii', label: { en: 'World War II', fr: 'Seconde Guerre mondiale' } },
    { id: 'postwar', label: { en: 'Post-War Years', fr: 'Annees d\'apres-guerre' } },
  ]

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <BackButton onBack={onBack} />
        <h2 className="text-kiosk-xl font-display text-museum-dark">
          {t(ui.featureGallery)}
        </h2>
        <div className="w-32" />
      </div>

      {/* Era filter tabs */}
      <div className="flex justify-center gap-2 px-8 mb-4">
        {eras.map((era) => (
          <button
            key={era.id}
            className="px-4 py-2 bg-museum-warm hover:bg-museum-highlight rounded-full text-kiosk-sm text-museum-dark transition-colors touch-target"
          >
            {t(era.label)}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="flex-1 mx-8 mb-8 overflow-auto">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div 
              key={i}
              className="aspect-square bg-museum-warm rounded-lg flex items-center justify-center text-museum-accent cursor-pointer hover:ring-4 hover:ring-museum-highlight transition-all touch-target"
            >
              [Photo {i}]
            </div>
          ))}
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center pb-4 text-museum-accent text-kiosk-sm">
        {t(ui.flipToRead)}
      </div>
    </div>
  )
}
