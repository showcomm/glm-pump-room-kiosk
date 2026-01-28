import ReactDOM from 'react-dom/client'
import './styles/index.css'

// ============================================
// TOGGLE: Switch between viewers
// ============================================
// For interactive kiosk (visitor mode):
import App from './components/interactive/InteractiveViewer'

// For splat testing (admin/capture mode):
// import App from './SplatTest'

// For original kiosk UI:
// import App from './App'

// Note: StrictMode removed because WebGL libraries
// don't handle React's double-mount/unmount cycle properly.
// StrictMode is only active in development anyway.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
