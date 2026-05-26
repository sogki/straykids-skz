import { AnimatePresence, motion } from 'framer-motion'
import { Infinity as InfinityIcon } from 'lucide-react'
import GuessSlots from '@/components/GuessSlots'
import HintPanel from '@/components/HintPanel'
import GuessHistoryList from '@/components/daily/GuessHistoryList'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

export default function DailyGuessPlay({
  state,
  puzzle,
  maxGuesses,
  countdown,
  hintLadder,
  placeholder,
  accent,
  triesLeft,
  playing,
  toast,
  shake,
  input,
  onInputChange,
  onKeyDown,
  onGuess,
  questionBadge,
  mode = 'daily',
  stats,
}) {
  const isUnlimited = mode === 'unlimited'
  return (
    <div
      className={`${gameStyles.panel} ${styles.board}`}
      style={{ '--game-accent': accent }}
    >
      {questionBadge && (
        <p className={styles.questionBadge}>{questionBadge}</p>
      )}

      <div className={styles.topBar}>
        <div className={styles.triesBlock}>
          <p className={styles.triesLabel}>Tries</p>
          <GuessSlots
            guesses={state.guesses}
            max={maxGuesses}
            status={state.status}
            showLabel={!playing}
          />
          {playing && (
            <span className={styles.tilesLabel}>{triesLeft} left</span>
          )}
        </div>
        {isUnlimited ? (
          <div className={styles.timerBlock}>
            <p className={styles.timerLabel}>
              <InfinityIcon size={12} aria-hidden="true" />
              <span>Unlimited mode</span>
            </p>
            <p className={styles.timerValue}>
              {stats?.streak ? `${stats.streak}` : '0'}
              <span className={styles.timerUnit}> streak</span>
            </p>
            <p className={styles.puzzleDate}>
              {stats?.played
                ? `${stats.wins}/${stats.played} solved`
                : 'First round of the session'}
            </p>
          </div>
        ) : (
          <div className={styles.timerBlock}>
            <p className={styles.timerLabel}>Next puzzle</p>
            <p className={styles.timerValue}>{countdown}</p>
            <p className={styles.puzzleDate}>Resets at midnight</p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="play"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <HintPanel ladder={hintLadder} variant="stage" />

          <div
            className={`${styles.playGrid} ${
              state.guesses.length === 0 ? styles.playGridNoLog : ''
            }`}
          >
            <div className={styles.playMain}>
              {toast && <p className={styles.toast}>{toast}</p>}

              <div className={styles.guessSection}>
                <p className={gameStyles.sectionLabel}>Your guess</p>
                <motion.div
                  className={styles.inputRow}
                  animate={shake ? { x: [-4, 4, 0] } : {}}
                >
                  <input
                    type="text"
                    className={gameStyles.input}
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoComplete="off"
                    autoFocus
                  />
                  <button
                    type="button"
                    className={`${gameStyles.btn} ${gameStyles.btnPrimary}`}
                    onClick={onGuess}
                    disabled={!input.trim()}
                  >
                    Guess
                  </button>
                </motion.div>
              </div>
            </div>

            {puzzle && state.guesses.length > 0 && (
              <GuessHistoryList
                guesses={state.guesses}
                puzzle={puzzle}
                title="Past guesses"
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
