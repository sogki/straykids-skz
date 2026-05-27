import { useEffect, useState } from 'react'

const DEFAULT_THRESHOLD = 40

/**
 * True once the user has scrolled past `threshold` px.
 */
export function useNavbarScrolled(threshold = DEFAULT_THRESHOLD) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let ticking = false

    const update = () => {
      setScrolled(window.scrollY > threshold)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrolled
}
