/**
 * Light rays overlay — adapted from React Bits
 * @see https://reactbits.dev/backgrounds/light-rays
 */
import LightRays from '@/components/backgrounds/LightRays'

export default function SkzLightRays({ className = '' }) {
  return (
    <LightRays
      className={className}
      raysOrigin="top-center"
      raysColor="#ffffff"
      raysSpeed={1}
      lightSpread={0.8}
      rayLength={1.8}
      fadeDistance={0.9}
      saturation={0.85}
      followMouse={false}
      mouseInfluence={0}
      noiseAmount={0.02}
      pulsating
    />
  )
}
