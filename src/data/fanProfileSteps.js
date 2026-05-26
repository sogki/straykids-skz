export const FAN_PROFILE_STEPS = [
  {
    id: 'you',
    title: 'About you',
    description:
      'Your name, bio, bias, era, and favourite song — the basics for your card.',
  },
  {
    id: 'skzoo',
    title: 'SKZOO buddy',
    description: 'Pick the SKZOO character that represents your bias.',
  },
  {
    id: 'layout',
    title: 'Card shape',
    description: 'Portrait cards are taller; banner cards are wider with a cinematic header.',
  },
  {
    id: 'banner',
    title: 'Card background',
    description:
      'Choose a gradient or a photo from the official Stray Kids gallery.',
  },
  {
    id: 'style',
    title: 'Colours',
    description:
      'Main colour fills the card background. Accent colour tints icons and highlights.',
  },
  {
    id: 'finish',
    title: 'Finish',
    description: 'Save your card in this browser or export a PNG to share.',
  },
]

export const FAN_PROFILE_STEP_COUNT = FAN_PROFILE_STEPS.length

/** Keep step index valid when the flow length changes (e.g. after removing a step). */
export function clampFanProfileStepIndex(index) {
  const max = FAN_PROFILE_STEPS.length - 1
  if (typeof index !== 'number' || Number.isNaN(index)) return 0
  return Math.min(Math.max(0, index), max)
}
