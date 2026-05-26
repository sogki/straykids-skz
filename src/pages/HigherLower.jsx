import { useEffect, useRef, useState } from 'react'
import GameShell from '@/components/GameShell'
import HLIntro from '@/components/higher-lower/HLIntro'
import HLBoard from '@/components/higher-lower/HLBoard'
import HLComplete from '@/components/higher-lower/HLComplete'
import { HIGHER_LOWER_CATEGORY_LIST } from '@/data/higherLowerData'
import { useHigherLower } from '@/hooks/useHigherLower'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import { absoluteSiteUrl } from '@/data/site'
import styles from '@/styles/HigherLower.module.css'

const DEFAULT_CATEGORY_ID = HIGHER_LOWER_CATEGORY_LIST[0]?.id ?? null

export default function HigherLower() {
  const [view, setView] = useState('intro') // intro | playing
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY_ID)

  useEffect(() => {
    trackGameStart('higher-lower')
  }, [])

  const game = useHigherLower({
    categoryId: view === 'playing' ? categoryId : null,
  })

  const lastCompleted = useRef(null)
  useEffect(() => {
    if (game.status !== 'over') return
    const stamp = `${categoryId}:${game.score}`
    if (lastCompleted.current === stamp) return
    lastCompleted.current = stamp
    trackGameComplete('higher-lower', {
      category: categoryId,
      streak: game.score,
      bestStreak: game.bestStreak,
    })
  }, [game.status, game.score, game.bestStreak, categoryId])

  return (
    <GameShell
      emoji="📈"
      accent={game.category?.accent ?? '#a855f7'}
      title="Higher or Lower"
      subtitle="One stat. Two SKZ cards. Stack the streak."
      meta={
        <>
          <span>Unlimited mode</span>
          <a href={absoluteSiteUrl('/higher-lower')} className={styles.metaLink}>
            skzarcade.com/higher-lower
          </a>
        </>
      }
    >
      {view === 'intro' && (
        <HLIntro
          selectedCategoryId={categoryId}
          onSelect={setCategoryId}
          onStart={() => {
            lastCompleted.current = null
            setView('playing')
          }}
        />
      )}

      {view === 'playing' && game.status !== 'over' && (
        <HLBoard
          category={game.category}
          left={game.left}
          right={game.right}
          score={game.score}
          bestStreak={game.bestStreak}
          status={game.status}
          lastPickCorrect={game.lastPickCorrect}
          onPickHigher={game.pickHigher}
          onPickLower={game.pickLower}
        />
      )}

      {view === 'playing' && game.status === 'over' && (
        <HLComplete
          category={game.category}
          left={game.left}
          right={game.right}
          score={game.score}
          bestStreak={game.bestStreak}
          onPlayAgain={() => {
            lastCompleted.current = null
            game.playAgain()
          }}
          onChangeCategory={() => setView('intro')}
        />
      )}
    </GameShell>
  )
}
