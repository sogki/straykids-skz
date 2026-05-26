import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Infinity as InfinityIcon,
  Share2,
  XCircle,
} from 'lucide-react'
import GuessSlots from '../GuessSlots'
import GuessHistoryList from '@/components/daily/GuessHistoryList'
import DailyGuessShareCard from '@/components/share/DailyGuessShareCard'
import { buildDailyGuessShare, copyDailyGuessLink } from '@/utils/dailyGuessShare'
import {
  captureDailyGuessShareCard,
  copyDailyGuessShareImage,
  downloadDailyGuessShareImage,
  nativeShareDailyGuessImage,
} from '@/utils/exportDailyGuessShare'
import styles from '@/styles/DailyGuess.module.css'
import gameStyles from '@/styles/GamePage.module.css'

export default function DailyGuessComplete({
  puzzle,
  state,
  maxGuesses,
  todayKey,
  countdown,
  onShareTrack,
  kind = 'song',
  enableShare = true,
  unlimitedHref,
}) {
  const won = state.status === 'won'
  const answer = puzzle.displayAnswer || puzzle.answers[0]
  const share = enableShare
    ? buildDailyGuessShare({
        todayKey,
        state,
        maxGuesses,
        won,
        kind,
      })
    : null

  const cardRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [copyMsg, setCopyMsg] = useState(null)

  useEffect(() => {
    if (!enableShare || !share) return

    let cancelled = false
    const timer = setTimeout(async () => {
      if (!cardRef.current) return
      try {
        const url = await captureDailyGuessShareCard(cardRef.current)
        if (!cancelled) setPreviewUrl(url)
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[share card]', err)
        }
      }
    }, 120)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [enableShare, share, todayKey, state.guesses, state.status, maxGuesses, won, kind])

  const loseLead =
    kind === 'member'
      ? puzzle.prompt
        ? `The answer was ${answer}.`
        : `It was ${answer}.`
      : kind === 'lyric'
        ? `The word was “${answer}”${puzzle.song ? ` (${puzzle.song})` : ''}.`
        : `The answer was ${answer}.`

  const winLead =
    kind === 'member'
      ? `Correct — ${answer} in ${state.guesses.length} of ${maxGuesses} tries.`
      : kind === 'lyric'
        ? `You filled the blank in ${state.guesses.length} of ${maxGuesses} tries.`
        : `Nice work — you found the song in ${state.guesses.length} of ${maxGuesses} tries.`

  function flash(msg) {
    setCopyMsg(msg)
    setTimeout(() => setCopyMsg(null), 2200)
  }

  async function ensureImage() {
    if (previewUrl) return previewUrl
    if (!cardRef.current) throw new Error('Share card not ready')
    const url = await captureDailyGuessShareCard(cardRef.current)
    setPreviewUrl(url)
    return url
  }

  async function handleCopyImage() {
    setImageBusy(true)
    try {
      const url = await ensureImage()
      const ok = await copyDailyGuessShareImage(url)
      if (ok) {
        flash('Image copied')
        onShareTrack?.('copy_image')
      } else {
        downloadDailyGuessShareImage(url, share.filename)
        flash('Downloaded image')
        onShareTrack?.('download_image')
      }
    } catch {
      flash('Could not copy image')
    } finally {
      setImageBusy(false)
    }
  }

  async function handleDownloadImage() {
    setImageBusy(true)
    try {
      const url = await ensureImage()
      downloadDailyGuessShareImage(url, share.filename)
      flash('Image saved')
      onShareTrack?.('download_image')
    } catch {
      flash('Could not save image')
    } finally {
      setImageBusy(false)
    }
  }

  async function handleNativeShare() {
    setImageBusy(true)
    try {
      const url = await ensureImage()
      const ok = await nativeShareDailyGuessImage(url, share)
      if (ok) onShareTrack?.('native')
    } catch {
      flash('Share failed')
    } finally {
      setImageBusy(false)
    }
  }

  async function handleCopyLink() {
    const ok = await copyDailyGuessLink(share)
    if (ok) {
      flash('Link copied')
      onShareTrack?.('copy_link')
    }
  }

  return (
    <div className={styles.completedScreen}>
      <div className={styles.completedHero}>
        <div
          className={`${styles.completedIcon} ${
            won ? styles.completedIconWin : styles.completedIconLoss
          }`}
          aria-hidden="true"
        >
          {won ? <CheckCircle2 size={32} strokeWidth={2.25} /> : <XCircle size={32} strokeWidth={2.25} />}
        </div>

        <p className={styles.completedKicker}>Today&apos;s puzzle</p>
        <h2 className={styles.completedTitle}>
          {won ? 'You already solved today!' : "You're done for today"}
        </h2>
        <p className={styles.completedLead}>
          {won ? winLead : `${loseLead} Come back tomorrow for a new puzzle.`}
        </p>

        <div className={styles.completedMeta}>
          <GuessSlots
            guesses={state.guesses}
            max={maxGuesses}
            status={state.status}
            showLabel
          />
          <div className={styles.completedCountdown}>
            <Clock size={15} aria-hidden="true" />
            <span>
              Next puzzle in <strong>{countdown}</strong>
            </span>
          </div>
          {unlimitedHref && (
            <Link to={unlimitedHref} className={styles.completedUnlimitedCta}>
              <InfinityIcon size={15} aria-hidden="true" />
              <span>
                Keep playing in <strong>Unlimited</strong>
              </span>
            </Link>
          )}
        </div>

        {state.guesses.length > 0 && (
          <div className={styles.completedHistory}>
            <GuessHistoryList
              guesses={state.guesses}
              puzzle={puzzle}
              title="Your guesses"
            />
          </div>
        )}
      </div>

      {enableShare && share ? (
        <div className={styles.sharePanel}>
          <h3 className={styles.sharePanelTitle}>Share your result</h3>
          <p className={styles.sharePanelHint}>
            Save or share your result card. Link previews use{' '}
            <span className={styles.shareDomain}>skzarcade.com</span>.
          </p>

          <div className={styles.shareCardStage} aria-hidden="true">
            <DailyGuessShareCard
              ref={cardRef}
              gameTitle={share.gameTitle}
              todayKey={todayKey}
              guesses={state.guesses}
              maxGuesses={maxGuesses}
              won={won}
              scoreLine={share.scoreLine}
              accent={share.accent}
            />
          </div>

          {previewUrl ? (
            <img
              className={styles.shareImagePreview}
              src={previewUrl}
              alt="Your result card preview"
            />
          ) : (
            <div className={styles.shareImageLoading}>Preparing share image…</div>
          )}

          {copyMsg && <p className={styles.shareToast}>{copyMsg}</p>}

          <div className={styles.shareActions}>
            <button
              type="button"
              className={`${gameStyles.btn} ${gameStyles.btnPrimary}`}
              onClick={handleCopyImage}
              disabled={imageBusy}
            >
              <Copy size={16} aria-hidden="true" />
              Copy image
            </button>
            <button
              type="button"
              className={`${gameStyles.btn} ${gameStyles.btnSecondary}`}
              onClick={handleDownloadImage}
              disabled={imageBusy}
            >
              <Download size={16} aria-hidden="true" />
              Download
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                type="button"
                className={`${gameStyles.btn} ${gameStyles.btnSecondary}`}
                onClick={handleNativeShare}
                disabled={imageBusy}
              >
                <Share2 size={16} aria-hidden="true" />
                Share…
              </button>
            )}
            <button
              type="button"
              className={`${gameStyles.btn} ${gameStyles.btnSecondary}`}
              onClick={handleCopyLink}
            >
              <Copy size={16} aria-hidden="true" />
              Copy link
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
