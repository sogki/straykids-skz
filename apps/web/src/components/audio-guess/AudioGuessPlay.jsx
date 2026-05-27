import { motion } from 'framer-motion'
import { Check, Forward, X } from 'lucide-react'
import { REVEAL_LENGTHS } from '@/hooks/useAudioGuess'
import { normalizeAnswer } from '@/utils/checkAnswer'
import AudioPlayer from './AudioPlayer'
import styles from '@/styles/AudioGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

function guessIsCorrect(guess, track) {
  if (!guess || !track?.answers?.length) return false
  if (guess === '— skipped —') return false
  const norm = normalizeAnswer(guess)
  return track.answers.some((a) => normalizeAnswer(a) === norm)
}

function isSkip(guess) {
  return guess === '— skipped —'
}

export default function AudioGuessPlay({
  track,
  state,
  input,
  setInput,
  toast,
  shake,
  triesLeft,
  wrongCount,
  revealSeconds,
  maxGuesses,
  onGuess,
  onKeyDown,
  onSkip,
}) {
  return (
    <div className={`${gameStyles.panel} ${styles.board}`}>
      <div className={styles.boardHead}>
        <div className={styles.boardHeadBlock}>
          <p className={styles.boardLabel}>Reveal stage</p>
          <p className={styles.boardValueLarge}>
            {revealSeconds}s
            <span className={styles.boardValueUnit}>clip</span>
          </p>
          <ul className={styles.stagePath} aria-label="Clip lengths">
            {REVEAL_LENGTHS.map((sec, idx) => (
              <li
                key={sec}
                className={`${styles.stageDot} ${
                  idx <= wrongCount ? styles.stageDotActive : ''
                }`}
                aria-current={idx === wrongCount ? 'step' : undefined}
              >
                {sec}s
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.boardHeadBlock}>
          <p className={styles.boardLabel}>Tries left</p>
          <p className={styles.boardValueLarge}>
            {triesLeft}
            <span className={styles.boardValueUnit}>/ {maxGuesses}</span>
          </p>
          <ul className={styles.tryRow} aria-label="Guesses">
            {Array.from({ length: maxGuesses }).map((_, i) => {
              const guess = state.guesses[i]
              const isFilled = i < state.guesses.length
              const isCorrect = isFilled && guessIsCorrect(guess, track)
              let stateClass = ''
              if (isFilled) {
                stateClass = isCorrect
                  ? styles.tryDotCorrect
                  : styles.tryDotWrong
              }
              return (
                <li
                  key={i}
                  className={`${styles.tryDot} ${stateClass}`}
                  aria-label={
                    !isFilled
                      ? 'Unused try'
                      : isCorrect
                        ? 'Correct guess'
                        : 'Wrong guess'
                  }
                />
              )
            })}
          </ul>
        </div>
      </div>

      <AudioPlayer
        previewUrl={track.preview}
        maxSeconds={revealSeconds}
        trackKey={track.id}
      />

      <div className={styles.guessSection}>
        {toast && <p className={styles.toast}>{toast}</p>}
        <p className={gameStyles.sectionLabel}>Your guess</p>
        <motion.div
          className={styles.inputRow}
          animate={shake ? { x: [-4, 4, 0] } : {}}
        >
          <input
            id="audio-guess-input"
            type="text"
            className={gameStyles.input}
            placeholder="Enter song title…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
          <button
            type="button"
            className={`${gameStyles.btn} ${styles.skipButton}`}
            onClick={onSkip}
            title="Use up a guess to unlock the next clip"
          >
            <Forward size={14} />
            Skip
          </button>
        </motion.div>
      </div>

      {state.guesses.length > 0 && (
        <div className={styles.guessLog}>
          <p className={styles.guessLogTitle}>Past guesses</p>
          <ul className={styles.guessList}>
            {state.guesses.map((g, i) => {
              const skipped = isSkip(g)
              const correct = !skipped && guessIsCorrect(g, track)
              return (
                <li
                  key={`${g}-${i}`}
                  className={`${styles.guessListItem} ${
                    correct
                      ? styles.guessListItemCorrect
                      : styles.guessListItemWrong
                  }`}
                >
                  <span className={styles.guessName}>
                    {skipped ? 'Skipped' : g}
                  </span>
                  <span
                    className={
                      correct ? styles.guessMarkCorrect : styles.guessMarkWrong
                    }
                    aria-label={correct ? 'Correct' : 'Wrong'}
                  >
                    {correct ? (
                      <Check size={14} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <X size={14} strokeWidth={3} aria-hidden="true" />
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
