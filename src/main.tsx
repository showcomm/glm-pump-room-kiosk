import ReactDOM from 'react-dom/client'
import './styles/index.css'

// ============================================
// TOGGLE: Switch between App and SplatTest
// ============================================
// For normal kiosk: import App from './App'
// For splat testing: import App from './SplatTest'
import App from './SplatTest'

// Note: StrictMode removed because WebGL libraries
// don't handle React's double-mount/unmount cycle properly.
// StrictMode is only active in development anyway.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
