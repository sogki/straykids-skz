import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import GameShell from '@/components/GameShell'
import { findSkzoo } from '@/data/profileAssets'
import {
  MEMORY_MATCH_CARDS_PER_SET,
  MEMORY_MATCH_MEMORIZE_SECONDS,
  MEMORY_MATCH_SET_COUNTS,
  formatSetCountLabel,
  getMatchSizeLabel,
  getTotalCards,
} from '@/data/memoryMatchOptions'
import { useMemoryMatch } from '@/hooks/useMemoryMatch'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import styles from '@/styles/MemoryMatch.module.css'

const ACCENT = '#22c55e'

const INTRO_STEPS = [
  'Choose SKZOO sets, match size (pair, triple, or quad), and how long you get to memorize.',
  'Tap Start — every card is shown face-up so you can memorize positions.',
  'When the board flips, reveal cards and match full sets in as few moves as you can.',
  'Each round uses a new random layout. Play as many times as you like.',
]

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MemoryMatch() {
  const game = useMemoryMatch()
  const completedRef = useRef(false)

  const draftTotal = getTotalCards(game.draftSettings)

  useEffect(() => {
    if (game.phase !== 'won' || completedRef.current) return
    completedRef.current = true
    trackGameComplete('memory-match', {
      moves: game.moves,
      seconds: game.elapsed,
      setCount: game.setCount,
      cardsPerSet: game.cardsPerSet,
      totalCards: game.totalCards,
    })
  }, [
    game.phase,
    game.moves,
    game.elapsed,
    game.setCount,
    game.cardsPerSet,
    game.totalCards,
  ])

  function handleStart() {
    completedRef.current = false
    trackGameStart('memory-match')
    game.startPreview()
  }

  const showBoard = game.phase !== 'intro' && game.deck.length > 0
  const showHud = game.phase === 'playing' || game.phase === 'won'
  const boardDisabled = game.phase === 'preview'
  const activeTotal = game.totalCards
  const activeBoardClass =
    activeTotal > 24 ? styles.boardHuge : activeTotal > 16 ? styles.boardWide : ''
  const activeCardClass = activeTotal > 16 ? styles.cardCompact : ''
  const matchWord = getMatchSizeLabel(game.settings.cardsPerSet)

  return (
    <GameShell
      fullWidth
      emoji="🃏"
      accent={ACCENT}
      title="SKZOO Match"
      subtitle="Match SKZOO sets — choose your board size and match rules."
      meta={<span>Minigame · Unlimited plays</span>}
    >
      <div className={styles.shell} style={{ '--game-accent': ACCENT }}>
        {game.phase === 'intro' && (
          <div className={styles.introLayout}>
            <div className={styles.introCard}>
              <h2 className={styles.introTitle}>How to play</h2>
              <ol className={styles.introList}>
                {INTRO_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <button type="button" className={styles.btnPrimary} onClick={handleStart}>
                Start game
              </button>
            </div>

            <aside className={styles.settingsCard} aria-label="Game options">
              <h2 className={styles.settingsTitle}>Your game</h2>
              <p className={styles.settingsLead}>
                Board size, match rules, and memorize time — saved for next time.
              </p>

              <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsLegend}>
                  SKZOO on board ({matchWord})
                </legend>
                <div
                  className={`${styles.settingsOptions} ${styles.settingsOptionsSets}`}
                  role="group"
                >
                  {MEMORY_MATCH_SET_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.settingsBtn} ${
                        game.draftSettings.setCount === n
                          ? styles.settingsBtnActive
                          : ''
                      }`}
                      onClick={() => game.updateDraftSettings({ setCount: n })}
                    >
                      {formatSetCountLabel(n, game.draftSettings.cardsPerSet)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsLegend}>Cards per match</legend>
                <div
                  className={`${styles.settingsOptions} ${styles.settingsOptionsMatch}`}
                  role="group"
                >
                  {MEMORY_MATCH_CARDS_PER_SET.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.settingsBtn} ${
                        game.draftSettings.cardsPerSet === n
                          ? styles.settingsBtnActive
                          : ''
                      }`}
                      onClick={() => game.updateDraftSettings({ cardsPerSet: n })}
                    >
                      {n === 2 ? 'Pair (2)' : n === 3 ? 'Triple (3)' : 'Quad (4)'}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.settingsGroup}>
                <legend className={styles.settingsLegend}>Memorize time</legend>
                <div
                  className={`${styles.settingsOptions} ${styles.settingsOptionsMemorize}`}
                  role="group"
                >
                  {MEMORY_MATCH_MEMORIZE_SECONDS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`${styles.settingsBtn} ${
                        game.draftSettings.memorizeSeconds === sec
                          ? styles.settingsBtnActive
                          : ''
                      }`}
                      onClick={() =>
                        game.updateDraftSettings({ memorizeSeconds: sec })
                      }
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </fieldset>

              <p className={styles.settingsSummary}>
                <strong>{draftTotal}</strong> cards · {game.draftSettings.setCount} sets
                of {game.draftSettings.cardsPerSet} ·{' '}
                <strong>{game.draftSettings.memorizeSeconds}s</strong> to memorize
              </p>
            </aside>
          </div>
        )}

        {showHud && (
          <div className={styles.hud}>
            <div className={styles.hudStat}>
              <span className={styles.hudLabel}>Moves</span>
              <span className={styles.hudValue}>{game.moves}</span>
            </div>
            <div className={styles.hudStat}>
              <span className={styles.hudLabel}>Time</span>
              <span className={styles.hudValue}>{formatTime(game.elapsed)}</span>
            </div>
            <div className={styles.hudStat}>
              <span className={styles.hudLabel}>Sets left</span>
              <span className={styles.hudValue}>{game.setsRemaining}</span>
            </div>
          </div>
        )}

        {game.phase === 'preview' && (
          <div className={styles.previewBanner}>
            <p className={styles.previewBannerTitle}>
              Memorize the SKZOO {matchWord}
            </p>
            <p className={styles.previewBannerSub}>
              Board flips in{' '}
              <strong>{game.previewSecondsLeft || game.previewTotalSeconds}</strong>s
            </p>
            <div className={styles.previewProgress} aria-hidden="true">
              <span
                key={game.previewNonce}
                className={styles.previewProgressBar}
                style={{
                  animationDuration: `${game.previewTotalSeconds}s`,
                }}
              />
            </div>
            <button
              type="button"
              className={styles.previewSkip}
              onClick={game.skipPreview}
            >
              I&apos;m ready — start matching
            </button>
          </div>
        )}

        {showBoard && (
          <div
            className={`${styles.board} ${activeBoardClass} ${boardDisabled ? styles.boardMemorize : ''}`}
            style={{ '--mm-cols': game.gridColumns }}
            role="grid"
            aria-label="SKZOO Match board"
          >
            {game.deck.map((card) => {
              const skzoo = findSkzoo(card.skzooId)
              const showFace = card.flipped || card.matched
              return (
                <button
                  key={card.uid}
                  type="button"
                  className={`${styles.card} ${activeCardClass} ${
                    showFace ? styles.cardFlipped : ''
                  } ${card.matched ? styles.cardMatched : ''}`}
                  onClick={() => game.flipCard(card.id)}
                  disabled={
                    game.phase !== 'playing' || card.matched || game.lock
                  }
                  aria-label={
                    showFace
                      ? `${skzoo?.name || 'SKZOO'} (${skzoo?.member || ''})${
                          card.matched ? ', matched' : ''
                        }`
                      : 'Hidden card'
                  }
                  style={{ '--card-color': skzoo?.color || ACCENT }}
                >
                  <div className={styles.cardInner}>
                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                      <span className={styles.cardBackMark}>SKZ</span>
                    </div>
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                      {skzoo?.image ? (
                        <img
                          src={skzoo.image}
                          alt=""
                          className={styles.cardImage}
                          width={80}
                          height={80}
                          decoding="async"
                        />
                      ) : (
                        <span className={styles.cardFallback}>?</span>
                      )}
                      <span className={styles.cardName}>{skzoo?.name || 'SKZOO'}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {game.phase === 'won' && (
          <div className={styles.winPanel}>
            <h2 className={styles.winTitle}>Board cleared!</h2>
            <p className={styles.winSub}>
              {game.moves} moves in {formatTime(game.elapsed)}.
            </p>
            <div className={styles.winActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  completedRef.current = false
                  game.restart()
                }}
              >
                Play again
              </button>
              <Link to="/arcade" className={styles.btnGhost}>
                More games
              </Link>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
