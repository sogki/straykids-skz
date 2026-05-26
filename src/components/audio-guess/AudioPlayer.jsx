import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import styles from '@/styles/AudioGuess.module.css'

const VOLUME_STORAGE_KEY = 'skz-audio-volume'
const MUTED_STORAGE_KEY = 'skz-audio-muted'

function readStoredVolume(fallback) {
  try {
    if (typeof window === 'undefined') return fallback
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY)
    if (raw == null) return fallback
    const num = Number(raw)
    if (!Number.isFinite(num)) return fallback
    return Math.min(1, Math.max(0, num))
  } catch {
    return fallback
  }
}

function readStoredMuted() {
  try {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(MUTED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStoredVolume(value) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(value))
  } catch {
    /* storage may be blocked */
  }
}

function writeStoredMuted(value) {
  try {
    if (typeof window === 'undefined') return
    if (value) window.localStorage.setItem(MUTED_STORAGE_KEY, '1')
    else window.localStorage.removeItem(MUTED_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Capped-length audio player.
 *
 * - `previewUrl`     URL to the 30-second iTunes preview MP3
 * - `maxSeconds`     hard cap on playback length (e.g. 2, 8, 15, 30)
 * - `seekable`       allow scrubbing the progress bar (full reveal only)
 * - `defaultVolume`  fallback 0..1 volume when no localStorage value exists yet
 *
 * Volume + mute state are persisted to localStorage (`skz-audio-volume`,
 * `skz-audio-muted`) so STAYs aren't blasted with a fresh 100%/30% on every
 * new track, mode switch, or refresh.
 *
 * When playback reaches `maxSeconds` the audio is paused automatically and
 * resets to 0. Replay always restarts at 0 so the user hears the full snippet.
 */
export default function AudioPlayer({
  previewUrl,
  maxSeconds,
  seekable = false,
  defaultVolume = 0.3,
  trackKey,
}) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(() => readStoredVolume(defaultVolume))
  const [muted, setMuted] = useState(() => readStoredMuted())

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  useEffect(() => {
    writeStoredVolume(volume)
  }, [volume])

  useEffect(() => {
    writeStoredMuted(muted)
  }, [muted])

  // Reset playback when the source or cap changes (new round / new reveal stage)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setProgress(0)
  }, [previewUrl, maxSeconds, trackKey])

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    const t = audio.currentTime
    if (t >= maxSeconds) {
      audio.pause()
      audio.currentTime = 0
      setIsPlaying(false)
      setProgress(0)
      return
    }
    setProgress(t)
  }

  function handleEnded() {
    setIsPlaying(false)
    setProgress(0)
  }

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }
    audio.currentTime = 0
    audio.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    )
  }

  function restart() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setProgress(0)
    if (!isPlaying) {
      audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false)
      )
    }
  }

  function handleScrub(e) {
    if (!seekable) return
    const audio = audioRef.current
    if (!audio) return
    const next = Number(e.target.value)
    audio.currentTime = next
    setProgress(next)
  }

  const pct = maxSeconds > 0 ? Math.min(100, (progress / maxSeconds) * 100) : 0

  return (
    <div className={styles.player}>
      <audio
        ref={audioRef}
        src={previewUrl}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <div className={styles.playerControls}>
        <button
          type="button"
          className={styles.playButton}
          onClick={toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>

        <div className={styles.playerTrack}>
          <div className={styles.playerMeta}>
            <span className={styles.playerTime}>{formatTime(progress)}</span>
            <span className={styles.playerCap}>
              {maxSeconds >= 30 ? '30s clip' : `${maxSeconds}s clip`}
            </span>
            <span className={styles.playerTime}>{formatTime(maxSeconds)}</span>
          </div>
          {seekable ? (
            <input
              type="range"
              min={0}
              max={maxSeconds}
              step={0.05}
              value={progress}
              onChange={handleScrub}
              className={styles.playerScrubber}
              style={{ '--progress-pct': `${pct}%` }}
              aria-label="Seek"
            />
          ) : (
            <div
              className={styles.playerProgress}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={maxSeconds}
              aria-valuenow={progress}
            >
              <div
                className={styles.playerProgressFill}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.playerIconButton}
          onClick={restart}
          aria-label="Restart"
          title="Restart clip"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className={styles.playerVolume}>
        <button
          type="button"
          className={styles.playerIconButton}
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = Number(e.target.value)
            setVolume(v)
            setMuted(v === 0)
          }}
          className={styles.playerVolumeSlider}
          aria-label="Volume"
        />
      </div>
    </div>
  )
}

function formatTime(s) {
  if (!Number.isFinite(s)) return '0:00'
  const total = Math.max(0, Math.floor(s))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
