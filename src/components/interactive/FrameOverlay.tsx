/**
 * Frame Overlay - Decorative border around the viewport
 * 
 * Creates a museum-quality frame effect using 4 separate edge pieces
 * so the center remains transparent for the 3D view.
 */

interface FrameOverlayProps {
  frameWidth: number
}

export function FrameOverlay({ frameWidth }: FrameOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Top edge */}
      <div 
        className="absolute top-0 left-0 right-0"
        style={{
          height: frameWidth,
          background: 'linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 60%, #0f0f0f 100%)',
          borderBottom: '1px solid #0a0a0a',
        }}
      />
      
      {/* Bottom edge */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: frameWidth,
          background: 'linear-gradient(to top, #1a1a1a 0%, #0f0f0f 60%, #0a0a0a 100%)',
          borderTop: '1px solid #252525',
        }}
      />
      
      {/* Left edge */}
      <div 
        className="absolute left-0"
        style={{
          top: frameWidth,
          bottom: frameWidth,
          width: frameWidth,
          background: 'linear-gradient(to right, #252525 0%, #1a1a1a 60%, #0f0f0f 100%)',
          borderRight: '1px solid #0a0a0a',
        }}
      />
      
      {/* Right edge */}
      <div 
        className="absolute right-0"
        style={{
          top: frameWidth,
          bottom: frameWidth,
          width: frameWidth,
          background: 'linear-gradient(to left, #1a1a1a 0%, #0f0f0f 60%, #0a0a0a 100%)',
          borderLeft: '1px solid #252525',
        }}
      />
      
      {/* Inner shadow overlay - transparent center with inset shadow */}
      <div 
        className="absolute"
        style={{
          top: frameWidth,
          left: frameWidth,
          right: frameWidth,
          bottom: frameWidth,
          boxShadow: `
            inset 0 6px 20px rgba(0, 0, 0, 0.7),
            inset 0 -2px 10px rgba(0, 0, 0, 0.3),
            inset 6px 0 20px rgba(0, 0, 0, 0.5),
            inset -6px 0 20px rgba(0, 0, 0, 0.5)
          `,
          borderRadius: '2px',
        }}
      />
    </div>
  )
}
