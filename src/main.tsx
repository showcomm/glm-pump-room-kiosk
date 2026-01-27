import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Note: StrictMode removed because gaussian-splats-3d library
// doesn't handle React's double-mount/unmount cycle properly.
// StrictMode is only active in development anyway.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
