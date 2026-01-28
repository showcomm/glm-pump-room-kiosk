import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/index.css'

// Pages
import InteractiveViewer from './components/interactive/InteractiveViewer'
import AdminLanding from './components/admin/AdminLanding'
import CameraCapture from './components/admin/CameraCapture'
import HotspotEditor from './components/admin/HotspotEditor'

// Note: StrictMode removed because WebGL libraries
// don't handle React's double-mount/unmount cycle properly.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<InteractiveViewer />} />
      <Route path="/admin" element={<AdminLanding />} />
      <Route path="/admin/camera-capture" element={<CameraCapture />} />
      <Route path="/admin/hotspot-editor" element={<HotspotEditor />} />
    </Routes>
  </BrowserRouter>
)
