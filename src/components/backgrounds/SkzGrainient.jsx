/**
 * Monochrome Grainient presets (white / gray / black)
 * @see https://reactbits.dev/backgrounds/grainient
 */
import Grainient from '@/components/backgrounds/Grainient'

const PRESETS = {
  footer: {
    timeSpeed: 0.08,
    color1: '#ffffff',
    color2: '#818384',
    color3: '#121213',
    warpStrength: 0.5,
    warpFrequency: 2.5,
    grainAmount: 0.07,
    contrast: 1.15,
    saturation: 0.35,
    zoom: 1.15,
  },
  community: {
    timeSpeed: 0.1,
    color1: '#e8e8e8',
    color2: '#818384',
    color3: '#1a1a1b',
    warpStrength: 0.55,
    warpFrequency: 3,
    grainAmount: 0.06,
    contrast: 1.1,
    saturation: 0.25,
    zoom: 1.05,
  },
  card: {
    timeSpeed: 0.1,
    color1: '#ffffff',
    color2: '#565758',
    color3: '#1a1a1b',
    warpStrength: 0.45,
    warpFrequency: 3,
    grainAmount: 0.05,
    contrast: 1.1,
    saturation: 0.2,
    zoom: 1.2,
  },
}

export default function SkzGrainient({ variant = 'card', className, ...overrides }) {
  const preset = PRESETS[variant] ?? PRESETS.card
  return <Grainient className={className} {...preset} {...overrides} />
}
