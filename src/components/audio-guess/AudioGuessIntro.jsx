import { Play, Music, Headphones, ListMusic } from 'lucide-react'
import styles from '@/styles/AudioGuess.module.css'

const STEPS = [
  {
    icon: Music,
    title: 'Hit play',
    body: 'Start the 2-second snippet. Wrong guesses unlock longer clips (8s → 15s → 30s).',
  },
  {
    icon: Headphones,
    title: 'Three tries',
    body: 'Type the song title. You only get three guesses before the answer reveals.',
  },
  {
    icon: ListMusic,
    title: 'Spotify follow-up',
    body: 'On the reveal screen we open the full song on Spotify so you can hear it all.',
  },
]

export default function AudioGuessIntro({ onStart, mode, trackCount }) {
  return (
    <div className={styles.intro}>
      <div className={styles.introHero}>
        <span className={styles.introBadge}>
          {mode === 'unlimited' ? 'Unlimited' : 'Daily'}
        </span>
        <h2 className={styles.introTitle}>Audio Guess</h2>
        <p className={styles.introSub}>
          We&apos;ll play a snippet of a Stray Kids track. Name it before the third
          guess.
        </p>
      </div>

      <div className={styles.introSteps}>
        {STEPS.map(({ icon: Icon, title, body }) => (
          <div key={title} className={styles.introStep}>
            <span className={styles.introStepIcon} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div>
              <p className={styles.introStepTitle}>{title}</p>
              <p className={styles.introStepBody}>{body}</p>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.introStart} onClick={onStart}>
        <Play size={18} />
        Start guessing
      </button>

      <p className={styles.introFootnote}>
        Plays a single 30-second preview at low volume. Pool · {trackCount} tracks.
      </p>
    </div>
  )
}
