import { useState } from 'react'
import { LanguageProvider } from './i18n/LanguageContext'
import { KioskShell } from './components/layout/KioskShell'
import { HomeScreen } from './components/features/HomeScreen'
import { EquipmentExplorer } from './components/features/EquipmentExplorer'
import { SystemAnimation } from './components/features/SystemAnimation'
import { BuildingCutaway } from './components/features/BuildingCutaway'
import { QuizMode } from './components/features/QuizMode'
import { PhotoGallery } from './components/features/PhotoGallery'

export type Feature = 'home' | 'explore' | 'animation' | 'cutaway' | 'quiz' | 'gallery'

function App() {
  const [activeFeature, setActiveFeature] = useState<Feature>('home')

  const renderFeature = () => {
    switch (activeFeature) {
      case 'home':
        return <HomeScreen onSelectFeature={setActiveFeature} />
      case 'explore':
        return <EquipmentExplorer onBack={() => setActiveFeature('home')} />
      case 'animation':
        return <SystemAnimation onBack={() => setActiveFeature('home')} />
      case 'cutaway':
        return <BuildingCutaway onBack={() => setActiveFeature('home')} />
      case 'quiz':
        return <QuizMode onBack={() => setActiveFeature('home')} />
      case 'gallery':
        return <PhotoGallery onBack={() => setActiveFeature('home')} />
      default:
        return <HomeScreen onSelectFeature={setActiveFeature} />
    }
  }

  return (
    <LanguageProvider>
      <KioskShell>
        {renderFeature()}
      </KioskShell>
    </LanguageProvider>
  )
}

export default App
