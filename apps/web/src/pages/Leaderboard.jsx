import { useEffect } from 'react'
import ArcadeLeaderboard from '@/components/home/ArcadeLeaderboard'

export default function Leaderboard() {
  useEffect(() => {
    document.title = 'Leaderboard · SKZ Arcade'
  }, [])

  return <ArcadeLeaderboard layout="page" />
}
