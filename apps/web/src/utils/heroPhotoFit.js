import { PROFILE_LAYOUTS } from '@/data/profileAssets'

/**
 * Smart crop anchor for gallery photos on profile cards.
 * Biases slightly above center so faces and upper bodies stay in frame
 * when cover-cropping — independent of the photo's own aspect ratio.
 */
const FOCUS_BY_LAYOUT = {
  [PROFILE_LAYOUTS.PORTRAIT]: 'center 28%',
  [PROFILE_LAYOUTS.BANNER]: 'center 22%',
}

export function computeHeroPhotoFit(profileLayout) {
  return {
    backgroundSize: 'cover',
    backgroundPosition:
      FOCUS_BY_LAYOUT[profileLayout] ?? FOCUS_BY_LAYOUT[PROFILE_LAYOUTS.PORTRAIT],
  }
}
