/**
 * Hotspot Overlay - SVG layer with touchable equipment regions
 * 
 * Renders hotspots as semi-transparent regions that visitors can tap
 * to navigate to equipment viewpoints.
 */

import { useKioskStore } from '../../store/kioskStore'
import { equipment } from '../../data/equipment'
import { HotspotCoordinates } from '../../data/types'

interface HotspotOverlayProps {
  frameWidth: number
}

export function HotspotOverlay({ frameWidth }: HotspotOverlayProps) {
  const { 
    navigateToEquipment, 
    selectedEquipmentId,
    isTransitioning,
    language 
  } = useKioskStore()
  
  // Don't show hotspots during transitions or when equipment is selected
  const showHotspots = !isTransitioning && !selectedEquipmentId
  
  const handleHotspotClick = (equipmentId: string) => {
    if (!isTransitioning) {
      navigateToEquipment(equipmentId)
    }
  }
  
  const renderHotspotShape = (coords: HotspotCoordinates, id: string) => {
    switch (coords.type) {
      case 'circle':
        return (
          <circle
            key={id}
            cx={`${coords.center_x}%`}
            cy={`${coords.center_y}%`}
            r={`${coords.radius}%`}
            className="hotspot-shape"
          />
        )
      case 'rectangle':
        return (
          <rect
            key={id}
            x={`${coords.x}%`}
            y={`${coords.y}%`}
            width={`${coords.width}%`}
            height={`${coords.height}%`}
            className="hotspot-shape"
          />
        )
      case 'polygon':
        const points = coords.points
          .map(p => `${p.x}%,${p.y}%`)
          .join(' ')
        return (
          <polygon
            key={id}
            points={points}
            className="hotspot-shape"
          />
        )
    }
  }
  
  return (
    <div 
      className="absolute pointer-events-none z-10"
      style={{
        top: frameWidth,
        left: frameWidth,
        right: frameWidth,
        bottom: frameWidth
      }}
    >
      <svg 
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <style>{`
          .hotspot-shape {
            fill: rgba(139, 115, 85, 0.0);
            stroke: rgba(196, 165, 116, 0.0);
            stroke-width: 0.3;
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.3s ease;
          }
          .hotspot-shape:hover {
            fill: rgba(139, 115, 85, 0.3);
            stroke: rgba(196, 165, 116, 0.8);
            stroke-width: 0.5;
          }
          .hotspot-shape.pulse {
            animation: hotspot-pulse 2s ease-in-out infinite;
          }
          @keyframes hotspot-pulse {
            0%, 100% { 
              fill: rgba(139, 115, 85, 0.0);
              stroke: rgba(196, 165, 116, 0.3);
            }
            50% { 
              fill: rgba(139, 115, 85, 0.15);
              stroke: rgba(196, 165, 116, 0.6);
            }
          }
        `}</style>
        
        {showHotspots && equipment.map(item => (
          <g 
            key={item.id}
            onClick={() => handleHotspotClick(item.id)}
            className="group"
          >
            {renderHotspotShape(item.hotspot.coordinates, item.hotspot.id)}
            
            {/* Label on hover - positioned near the hotspot */}
            {item.hotspot.coordinates.type === 'rectangle' && (
              <text
                x={`${item.hotspot.coordinates.x + item.hotspot.coordinates.width / 2}%`}
                y={`${item.hotspot.coordinates.y - 2}%`}
                textAnchor="middle"
                className="fill-museum-highlight text-[2px] font-body opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                {item.name[language]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
