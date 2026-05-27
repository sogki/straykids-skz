import { useEffect, useState } from 'react'
import { formatCountdown } from '@/utils/dailyPuzzle'

/** Live countdown to local midnight (updates every second). */
export function useMidnightCountdown(intervalMs = 1000) {
  const [countdown, setCountdown] = useState(formatCountdown)

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown())
    tick()
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return countdown
}
