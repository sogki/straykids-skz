import { useCallback, useRef, useState } from 'react'
import '@/styles/FanProfilePreviewTilt.css'

const MAX_TILT = 10

/**
 * 3D tilt on live preview. Pointer position drives a soft inset highlight on the card shell.
 */
export default function FanProfilePreviewTilt({
  children,
  className = '',
  disabled = false,
}) {
  const rootRef = useRef(null)
  const [hover, setHover] = useState(false)
  const [vars, setVars] = useState({
    '--preview-tilt-x': '0deg',
    '--preview-tilt-y': '0deg',
    '--preview-shine-x': '50%',
    '--preview-shine-y': '50%',
  })

  const handleMove = useCallback(
    (e) => {
      if (disabled) return
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      const rotateY = (px - 0.5) * MAX_TILT * 2
      const rotateX = (0.5 - py) * MAX_TILT * 2

      setVars({
        '--preview-tilt-x': `${rotateX.toFixed(2)}deg`,
        '--preview-tilt-y': `${rotateY.toFixed(2)}deg`,
        '--preview-shine-x': `${(px * 100).toFixed(1)}%`,
        '--preview-shine-y': `${(py * 100).toFixed(1)}%`,
      })
    },
    [disabled]
  )

  const handleLeave = useCallback(() => {
    setHover(false)
    setVars({
      '--preview-tilt-x': '0deg',
      '--preview-tilt-y': '0deg',
      '--preview-shine-x': '50%',
      '--preview-shine-y': '50%',
    })
  }, [])

  return (
    <div
      ref={rootRef}
      className={`fan-profile-preview-tilt ${hover && !disabled ? 'fan-profile-preview-tilt--hover' : ''} ${disabled ? 'fan-profile-preview-tilt--disabled' : ''} ${className}`.trim()}
      style={vars}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      <div className="fan-profile-preview-tilt__inner">{children}</div>
    </div>
  )
}
