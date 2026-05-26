import { forwardRef, useEffect, useState } from 'react'
import { SITE_LOGOS } from '@/data/site'
import styles from '@/styles/DailyGuessShareCard.module.css'

function useLogoDataUrl(src) {
  const [dataUrl, setDataUrl] = useState(src)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(src, { mode: 'cors' })
        if (!res.ok) return
        const blob = await res.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          if (!cancelled && typeof reader.result === 'string') {
            setDataUrl(reader.result)
          }
        }
        reader.readAsDataURL(blob)
      } catch {
        /* keep remote src */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [src])

  return dataUrl
}

function formatShareDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return dateKey
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ShareTiles({ guesses, max, won }) {
  return (
    <div className={styles.tiles} aria-hidden="true">
      {Array.from({ length: max }).map((_, i) => {
        const used = i < guesses.length
        const isWin = won && used && i === guesses.length - 1
        const isWrong = used && !isWin
        return (
          <span
            key={i}
            className={`${styles.tile} ${
              isWin ? styles.tileWin : isWrong ? styles.tileMiss : styles.tileEmpty
            }`}
          />
        )
      })}
    </div>
  )
}

/**
 * Branded result card captured as PNG for social sharing.
 */
const DailyGuessShareCard = forwardRef(function DailyGuessShareCard(
  {
    gameTitle,
    todayKey,
    guesses,
    maxGuesses,
    won,
    scoreLine,
    accent = '#a855f7',
    logoSrc = SITE_LOGOS.white,
  },
  ref
) {
  const logo = useLogoDataUrl(logoSrc)

  return (
    <article
      ref={ref}
      className={styles.card}
      style={{ '--share-accent': accent }}
      aria-hidden="true"
    >
      <header className={styles.brand}>
        <img
          className={styles.logo}
          src={logo}
          alt=""
          width={120}
          height={32}
          crossOrigin="anonymous"
        />
        <span className={styles.brandName}>SKZ Arcade</span>
      </header>

      <div className={styles.separator} role="presentation" />

      <div className={styles.panel}>
        <p className={styles.gameTitle}>{gameTitle}</p>
        <p className={styles.date}>{formatShareDate(todayKey)}</p>
        <ShareTiles guesses={guesses} max={maxGuesses} won={won} />
        <p className={styles.score}>{scoreLine}</p>
      </div>

      <footer className={styles.footer}>skzarcade.com</footer>
    </article>
  )
})

export default DailyGuessShareCard
