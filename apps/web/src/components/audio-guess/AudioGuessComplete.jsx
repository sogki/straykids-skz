import { Link } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Flame,
  Infinity as InfinityIcon,
  RotateCcw,
  Trophy,
  X,
  XCircle,
} from 'lucide-react'
import { normalizeAnswer } from '@/utils/checkAnswer'
import { MAX_GUESSES } from '@/hooks/useAudioGuess'
import AudioPlayer from './AudioPlayer'
import styles from '@/styles/AudioGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

const FULL_LENGTH = 30

function guessIsCorrect(guess, track) {
  if (!guess || !track?.answers?.length) return false
  if (guess === '— skipped —') return false
  const norm = normalizeAnswer(guess)
  return track.answers.some((a) => normalizeAnswer(a) === norm)
}

function isSkip(guess) {
  return guess === '— skipped —'
}

export default function AudioGuessComplete({
  track,
  state,
  mode,
  stats,
  countdown,
  onPlayAgain,
  unlimitedHref,
}) {
  const won = state.status === 'won'

  return (
    <div className={`${gameStyles.panel} ${styles.complete}`}>
      <div className={styles.completeHead}>
        {won ? (
          <span className={`${styles.statusPill} ${styles.statusPillWon}`}>
            <CheckCircle2 size={14} />
            Got it
          </span>
        ) : (
          <span className={`${styles.statusPill} ${styles.statusPillLost}`}>
            <XCircle size={14} />
            Better luck next time
          </span>
        )}
        <h2 className={styles.completeTitle}>{track.title}</h2>
        <p className={styles.completeMeta}>
          {track.album} · {track.year}
        </p>
        <ul
          className={`${styles.tryRow} ${styles.tryRowReveal}`}
          aria-label="Guess history"
        >
          {Array.from({ length: MAX_GUESSES }).map((_, i) => {
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

      <div className={styles.completeBody}>
        <div className={styles.completeArt}>
          {track.cover ? (
            <img src={track.cover} alt={`${track.title} cover art`} />
          ) : (
            <div className={styles.completeArtFallback}>♪</div>
          )}
        </div>

        <div className={styles.completeRight}>
          <p className={styles.completeLead}>
            {won ? (
              <>You nailed it in <strong>{state.guesses.length}</strong> try{state.guesses.length === 1 ? '' : 'ies'}.</>
            ) : (
              <>The answer was <strong>{track.title}</strong>.</>
            )}
          </p>

          <AudioPlayer
            previewUrl={track.preview}
            maxSeconds={FULL_LENGTH}
            seekable
            trackKey={`complete-${track.id}`}
          />

          <a
            href={track.spotifySearch}
            target="_blank"
            rel="noopener noreferrer"
            className={`${gameStyles.btn} ${styles.spotifyButton}`}
          >
            <ExternalLink size={16} />
            Listen on Spotify
          </a>

          {state.guesses.length > 0 && (
            <div className={styles.guessLog}>
              <p className={styles.guessLogTitle}>Your guesses</p>
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
                          correct
                            ? styles.guessMarkCorrect
                            : styles.guessMarkWrong
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
      </div>

      {mode === 'unlimited' ? (
        <UnlimitedFooter stats={stats} onPlayAgain={onPlayAgain} />
      ) : (
        <DailyFooter countdown={countdown} unlimitedHref={unlimitedHref} />
      )}
    </div>
  )
}

function DailyFooter({ countdown, unlimitedHref }) {
  return (
    <div className={styles.completeFooter}>
      <div className={styles.completeCountdown}>
        <p className={styles.boardLabel}>Next puzzle</p>
        <p className={styles.boardValueLarge}>{countdown}</p>
      </div>
      {unlimitedHref && (
        <Link to={unlimitedHref} className={`${gameStyles.btn} ${gameStyles.btnPrimary}`}>
          <InfinityIcon size={16} />
          Keep playing in Unlimited
        </Link>
      )}
    </div>
  )
}

function UnlimitedFooter({ stats, onPlayAgain }) {
  return (
    <div className={styles.completeFooter}>
      <div className={styles.statsRow}>
        <div className={styles.statTile}>
          <Trophy size={14} />
          <span className={styles.statValue}>{stats?.played ?? 0}</span>
          <span className={styles.statLabel}>Rounds</span>
        </div>
        <div className={styles.statTile}>
          <CheckCircle2 size={14} />
          <span className={styles.statValue}>{stats?.wins ?? 0}</span>
          <span className={styles.statLabel}>Wins</span>
        </div>
        <div className={styles.statTile}>
          <Flame size={14} />
          <span className={styles.statValue}>{stats?.streak ?? 0}</span>
          <span className={styles.statLabel}>Streak</span>
        </div>
        <div className={styles.statTile}>
          <Flame size={14} />
          <span className={styles.statValue}>{stats?.bestStreak ?? 0}</span>
          <span className={styles.statLabel}>Best</span>
        </div>
      </div>
      <button
        type="button"
        className={`${gameStyles.btn} ${gameStyles.btnPrimary}`}
        onClick={onPlayAgain}
      >
        <RotateCcw size={16} />
        Next track
      </button>
    </div>
  )
}
