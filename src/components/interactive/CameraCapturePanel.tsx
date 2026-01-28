/**
 * Camera Capture Panel - Admin tool for capturing viewpoints
 * 
 * Only visible in admin mode. Shows current camera position and allows
 * saving viewpoints for equipment.
 */

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@playcanvas/react/hooks'
import { useKioskStore } from '../../store/kioskStore'

export function CameraCapturePanel() {
  const { isAdminMode } = useKioskStore()
  const app = useApp()
  const [cameraData, setCameraData] = useState({ pos: [0, 0, 0], rot: [0, 0, 0] })
  const [copied, setCopied] = useState(false)
  const frameRef = useRef<number>()
  
  // Live camera position updates
  useEffect(() => {
    if (!isAdminMode || !app) return
    
    const updateLoop = () => {
      const cameraEntity = app.root.findByName('camera')
      if (cameraEntity) {
        const pos = cameraEntity.getLocalPosition()
        const rot = cameraEntity.getLocalEulerAngles()
        setCameraData({
          pos: [pos.x, pos.y, pos.z],
          rot: [rot.x, rot.y, rot.z]
        })
      }
      frameRef.current = requestAnimationFrame(updateLoop)
    }
    
    frameRef.current = requestAnimationFrame(updateLoop)
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isAdminMode, app])
  
  if (!isAdminMode) return null
  
  const formatNum = (v: number, decimals: number = 3) => {
    const rounded = Number(v.toFixed(decimals))
    return Object.is(rounded, -0) ? '0' : rounded.toString()
  }
  
  const handleCopy = () => {
    const viewpointCode = `{
  id: 'viewpoint-name',
  equipment_id: 'equipment-id',
  position: [${cameraData.pos.map(v => formatNum(v)).join(', ')}],
  rotation: [${cameraData.rot.map(v => formatNum(v, 2)).join(', ')}],
  fov: 60,
  label: {
    en: 'English Label',
    fr: 'French Label'
  }
}`
    navigator.clipboard.writeText(viewpointCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="absolute top-20 left-8 z-40 bg-black/90 text-white p-4 rounded-lg font-mono text-sm max-w-sm">
      <div className="text-yellow-400 font-bold mb-3">Camera Capture (Admin)</div>
      
      <div className="space-y-2 mb-4">
        <div>
          <span className="text-gray-400">Position: </span>
          [{cameraData.pos.map(v => formatNum(v)).join(', ')}]
        </div>
        <div>
          <span className="text-gray-400">Rotation: </span>
          [{cameraData.rot.map(v => formatNum(v, 2)).join(', ')}]
        </div>
      </div>
      
      <button
        onClick={handleCopy}
        className={`w-full py-2 rounded transition-colors ${
          copied 
            ? 'bg-green-600 text-white' 
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {copied ? 'Copied!' : 'Copy Viewpoint Code'}
      </button>
      
      <div className="text-gray-500 text-xs mt-3">
        Triple-tap top-left corner to exit admin mode
      </div>
    </div>
  )
}
