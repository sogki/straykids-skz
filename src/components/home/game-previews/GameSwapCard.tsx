import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import GuessSlots from '@/components/GuessSlots'
import HintPanel from '@/components/HintPanel'
import { quizQuestions } from '@/data/biasQuiz'
import gameStyles from '@/styles/GamePage.module.css'
import dailyStyles from '@/styles/DailyGuess.module.css'
import type { SkzGame } from '@/types/game'
import p from './GameUiPreview.module.css'
import barStyles from './GameSwapCard.module.css'

const SONG_LADDER = [
  { index: 0, label: 'Clue', unlocked: true, type: 'emoji', content: '🔥🚪' },
  { index: 1, label: 'Type', unlocked: true, type: 'category', content: 'Title track' },
  { index: 2, label: 'Hint', unlocked: false, type: 'hint', content: '—' },
  { index: 3, label: 'Letters', unlocked: false, type: 'letters', content: '' },
  { index: 4, label: 'Year', unlocked: false, type: 'year', content: '—' },
]

function gameSlug(game: SkzGame) {
  return (game.slug ?? game.id).replace(/^\//, '')
}

interface GameSwapCardProps {
  game: SkzGame
  isFront: boolean
}

/** React Bits demo layout: gradient title bar + body (body fades, not the card). */
export default function GameSwapCard({ game, isFront }: GameSwapCardProps) {
  const slug = gameSlug(game)
  const label = game.tag || game.title

  return (
    <div className={barStyles.wrap}>
      <div className={barStyles.bar}>
        <span className="mr-2">{game.emoji}</span>
        {label}
      </div>
      <div className={barStyles.body}>
        <motion.div
          className={barStyles.bodyInner}
          initial={false}
          animate={{ opacity: isFront ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          aria-hidden={!isFront}
        >
          <GameFace slug={slug} game={game} />
        </motion.div>
      </div>
    </div>
  )
}

function GameFace({ slug, game }: { slug: string; game: SkzGame }) {
  if (slug === 'guess-song') return <GuessSongFace />
  if (slug === 'fan-profile') return <FanProfileFace />
  if (slug === 'bias-quiz') return <BiasQuizFace />
  return <p className="p-4 text-sm text-[#999]">{game.description}</p>
}

function GuessSongFace() {
  return (
    <div className={`${gameStyles.panel} ${dailyStyles.board} ${p.panel}`}>
      <p className={p.previewStep}>Guess the song · clues unlock on misses</p>
      <div className={dailyStyles.tilesCompact}>
        <GuessSlots guesses={['Maniac']} max={5} status="playing" />
      </div>
      <div className={dailyStyles.cluesCompact}>
        <HintPanel ladder={SONG_LADDER} />
      </div>
      <div className={`${dailyStyles.inputRow} ${p.inputRow}`}>
        <input
          type="text"
          className={`${gameStyles.input} ${p.input}`}
          placeholder="Song title…"
          readOnly
          tabIndex={-1}
        />
        <button
          type="button"
          className={`${gameStyles.btn} ${gameStyles.btnPrimary} ${p.btn}`}
          tabIndex={-1}
        >
          Guess
        </button>
      </div>
    </div>
  )
}

function FanProfileFace() {
  const demo = {
    stayName: 'STAY_Jay',
    bias: 'Han',
    favouriteSong: "God's Menu",
    favouriteEra: '5-STAR',
    colour: '#a855f7',
  }
  return (
    <div className={`${gameStyles.gameColumns} ${p.gameColumns}`}>
      <div className={`${gameStyles.panel} ${p.innerPanel}`}>
        <p className={p.previewStep}>Fill in → save to your browser</p>
        <span className={`${gameStyles.label} ${p.label}`}>Name</span>
        <input
          type="text"
          className={`${gameStyles.input} ${p.input}`}
          value={demo.stayName}
          readOnly
          tabIndex={-1}
        />
        <span className={`${gameStyles.label} ${p.label}`}>Bias</span>
        <input
          type="text"
          className={`${gameStyles.input} ${p.input}`}
          value={demo.bias}
          readOnly
          tabIndex={-1}
        />
      </div>
      <div className={`${gameStyles.panel} ${p.innerPanel}`}>
        <div
          className={`${gameStyles.profilePreview} ${p.profilePreview}`}
          style={{ borderLeftColor: demo.colour, borderLeftWidth: 3, borderLeftStyle: 'solid' }}
        >
          <div className={gameStyles.profileHeader}>
            <div className={`${gameStyles.profileAvatar} ${p.profileAvatar}`}>
              <User size={14} color="var(--text-muted)" />
            </div>
            <div>
              <div className={`${gameStyles.profileName} ${p.profileName}`}>
                {demo.stayName}
              </div>
              <div className={`${gameStyles.profileTag} ${p.profileTag}`}>STAY card</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BiasQuizFace() {
  const q = quizQuestions[0]
  return (
    <div className={`${gameStyles.panel} ${p.panel}`}>
      <p className={p.previewStep}>6 questions · pick what fits you</p>
      <div className={`${gameStyles.quizProgress} ${p.quizProgress}`}>
        <div className={`${gameStyles.progressTrack} ${p.progressTrack}`}>
          <div className={gameStyles.progressBar} style={{ width: '16%' }} />
        </div>
      </div>
      <p className={`${gameStyles.questionText} ${p.questionText}`}>{q.question}</p>
      <div className={`${gameStyles.optionList} ${p.optionList}`}>
        {q.options.slice(0, 3).map((opt) => (
          <button
            key={opt.text}
            type="button"
            className={`${gameStyles.option} ${p.option}`}
            tabIndex={-1}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )
}
