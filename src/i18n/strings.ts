/**
 * UI strings for the kiosk interface
 */

import { BilingualText } from '../data/types'

export const ui: Record<string, BilingualText> = {
  // Home screen
  welcome: {
    en: 'Explore the Pump Room',
    fr: 'Explorez la salle des pompes'
  },
  touchPrompt: {
    en: 'Touch any equipment to learn more',
    fr: 'Touchez l\'equipement pour en savoir plus'
  },
  
  // Feature names
  featureExplore: {
    en: 'Explore Equipment',
    fr: 'Explorer l\'equipement'
  },
  featureAnimation: {
    en: 'See It in Action',
    fr: 'Voir en action'
  },
  featureCutaway: {
    en: 'Building Cutaway',
    fr: 'Coupe du batiment'
  },
  featureQuiz: {
    en: 'Test Your Knowledge',
    fr: 'Testez vos connaissances'
  },
  featureGallery: {
    en: 'Photo Gallery',
    fr: 'Galerie de photos'
  },
  
  // Navigation
  back: {
    en: 'Back',
    fr: 'Retour'
  },
  close: {
    en: 'Close',
    fr: 'Fermer'
  },
  next: {
    en: 'Next',
    fr: 'Suivant'
  },
  previous: {
    en: 'Previous',
    fr: 'Precedent'
  },
  
  // Equipment details
  function: {
    en: 'Function',
    fr: 'Fonction'
  },
  specifications: {
    en: 'Specifications',
    fr: 'Specifications'
  },
  yearInstalled: {
    en: 'Year Installed',
    fr: 'Annee d\'installation'
  },
  manufacturer: {
    en: 'Manufacturer',
    fr: 'Fabricant'
  },
  
  // Quiz
  quizCorrect: {
    en: 'Correct!',
    fr: 'Correct!'
  },
  quizTryAgain: {
    en: 'Try again',
    fr: 'Essayez encore'
  },
  quizScore: {
    en: 'Score',
    fr: 'Score'
  },
  
  // Animation
  play: {
    en: 'Play',
    fr: 'Lecture'
  },
  pause: {
    en: 'Pause',
    fr: 'Pause'
  },
  restart: {
    en: 'Restart',
    fr: 'Recommencer'
  },
  
  // Gallery
  flipToRead: {
    en: 'Tap to flip',
    fr: 'Touchez pour retourner'
  },
  
  // Statistics
  pumpCapacity: {
    en: '2,100,000 gallons emptied in 75 minutes',
    fr: '2 100 000 gallons vides en 75 minutes'
  },
  pumpRate: {
    en: '14,000 gallons per minute per pump',
    fr: '14 000 gallons par minute par pompe'
  }
}
