import { useState, useEffect, useRef } from 'react'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import GameShell from '../components/GameShell'
import GameSteps from '../components/games/GameSteps'
import { quizQuestions, members } from '../data/biasQuiz'
import { absoluteSiteUrl } from '@/data/site'
import styles from '../styles/GamePage.module.css'
import dailyStyles from '../styles/DailyGuess.module.css'

const ACCENT = '#38bdf8'
const HOW_TO = [
  'Read each question and tap one answer.',
  'There are no wrong choices — we match you to a member vibe.',
  'You can play again anytime for a new result.',
]

function calculateResult(answers) {
  const scores = {}
  answers.forEach((memberId) => {
    scores[memberId] = (scores[memberId] || 0) + 1
  })
  let topId = answers[0] || 'bangchan'
  let topScore = 0
  Object.entries(scores).forEach(([id, count]) => {
    if (count > topScore) {
      topScore = count
      topId = id
    }
  })
  return members[topId] || members.bangchan
}

export default function BiasQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)

  const total = quizQuestions.length
  const question = quizQuestions[step]
  const isFinished = step >= total
  const progress = isFinished ? 100 : Math.round((step / total) * 100)
  const completedRef = useRef(false)

  useEffect(() => {
    trackGameStart('bias-quiz')
  }, [])

  useEffect(() => {
    if (!result || completedRef.current) return
    completedRef.current = true
    trackGameComplete('bias-quiz', { member: result.id })
  }, [result])

  function handleSelect(option) {
    setSelected(option.member)
  }

  function handleNext() {
    if (!selected) return
    const nextAnswers = [...answers, selected]
    setAnswers(nextAnswers)
    setSelected(null)

    if (step + 1 >= total) {
      setResult(calculateResult(nextAnswers))
      setStep(total)
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleRestart() {
    setStep(0)
    setAnswers([])
    setSelected(null)
    setResult(null)
    completedRef.current = false
  }

  const shellProps = {
    fullWidth: true,
    emoji: '🎯',
    accent: ACCENT,
    title: 'Bias Quiz',
    subtitle: isFinished
      ? 'Your result is ready.'
      : 'Six short questions — choose the answer that sounds most like you.',
    meta: isFinished ? (
      <span>Result · {result?.name}</span>
    ) : (
      <>
        <span>
          Question {step + 1} of {total}
        </span>
        <a href={absoluteSiteUrl('/bias-quiz')} className={dailyStyles.metaLink}>
          skzarcade.com/bias-quiz
        </a>
      </>
    ),
    headerActions: <GameSteps steps={HOW_TO} variant="header" />,
  }

  if (isFinished && result) {
    return (
      <GameShell {...shellProps}>
        <div className={styles.panel} style={{ '--game-accent': ACCENT }}>
          <div className={styles.resultCard}>
            <div className={styles.resultEmoji}>{result.emoji}</div>
            <h2 className={styles.resultName}>{result.name}</h2>
            <p className={styles.resultDesc}>{result.description}</p>
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
            onClick={handleRestart}
          >
            <RotateCcw size={16} /> Play again
          </button>
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell {...shellProps}>
      <div className={styles.panel} style={{ '--game-accent': ACCENT }}>
        <p className={styles.sectionLabel}>
          Question {step + 1} — pick one answer
        </p>
        <div className={styles.quizProgress}>
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressBar}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.quizSteps}>
            {quizQuestions.map((q, i) => (
              <span
                key={q.id}
                className={`${styles.quizDot} ${
                  i < step
                    ? styles.quizDotDone
                    : i === step
                      ? styles.quizDotActive
                      : ''
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className={styles.questionText}>{question.question}</p>
            <div className={styles.optionList}>
              {question.options.map((opt) => (
                <button
                  key={opt.text}
                  type="button"
                  className={`${styles.option} ${
                    selected === opt.member ? styles.optionSelected : ''
                  }`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
          onClick={handleNext}
          disabled={!selected}
        >
          {step + 1 >= total ? 'See result' : 'Next'}
        </button>
      </div>
    </GameShell>
  )
}
