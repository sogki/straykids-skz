import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  SKZOO_CHARACTERS,
  normalizeProfileAssetPath,
} from '@/data/profileAssets'
import {
  getBoardGridColumns,
  getTotalCards,
  loadMemoryMatchSettings,
  normalizeMemoryMatchSettings,
  saveMemoryMatchSettings,
} from '@/data/memoryMatchOptions'
import { seededShuffle } from '@/utils/seededRandom'

const MISMATCH_MS = 750

const skzooList = SKZOO_CHARACTERS.map((c) => ({
  ...c,
  image: normalizeProfileAssetPath(c.image),
}))

function newGameSeed() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Pick `setCount` SKZOO ids (repeats allowed when setCount > 8). */
function pickSkzooIds(seed, setCount) {
  const base = skzooList.map((c) => c.id)
  const pool = []
  while (pool.length < setCount) {
    pool.push(...seededShuffle([...base], `${seed}-pool-${pool.length}`))
  }
  return pool.slice(0, setCount)
}

function buildDeck(seed, settings) {
  const { setCount, cardsPerSet } = settings
  const skzooIds = pickSkzooIds(seed, setCount)
  const cards = skzooIds.flatMap((skzooId, setIndex) =>
    Array.from({ length: cardsPerSet }, (_, copy) => ({
      uid: `${skzooId}-${setIndex}-${copy}-${seed.slice(0, 8)}`,
      skzooId,
      setIndex,
    }))
  )
  return seededShuffle(cards, `${seed}-deck`).map((card, index) => ({
    ...card,
    id: index,
    flipped: false,
    matched: false,
  }))
}

export function useMemoryMatch() {
  const [draftSettings, setDraftSettings] = useState(() => loadMemoryMatchSettings())
  const [activeSettings, setActiveSettings] = useState(null)
  const [deck, setDeck] = useState([])
  const [phase, setPhase] = useState('intro')
  const [moves, setMoves] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [lock, setLock] = useState(false)
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState(
    () => loadMemoryMatchSettings().memorizeSeconds
  )
  const [previewNonce, setPreviewNonce] = useState(0)
  const flippedRef = useRef([])
  const timerRef = useRef(null)
  const previewTimerRef = useRef(null)
  const previewTickRef = useRef(null)
  const startedAtRef = useRef(null)

  const settings = activeSettings ?? draftSettings
  const totalCards = getTotalCards(settings)
  const gridColumns = getBoardGridColumns(totalCards)
  const canEditSettings = phase === 'intro'

  const setsRemaining = useMemo(() => {
    if (!deck.length) return settings.setCount
    const matched = deck.filter((c) => c.matched).length
    return settings.setCount - Math.floor(matched / settings.cardsPerSet)
  }, [deck, settings.setCount, settings.cardsPerSet])

  const updateDraftSettings = useCallback(
    (partial) => {
      if (!canEditSettings) return
      setDraftSettings((prev) => normalizeMemoryMatchSettings({ ...prev, ...partial }))
    },
    [canEditSettings]
  )

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    if (previewTickRef.current) clearInterval(previewTickRef.current)
    timerRef.current = null
    previewTimerRef.current = null
    previewTickRef.current = null
  }, [])

  const beginPlaying = useCallback(() => {
    clearTimers()
    setDeck((prev) => prev.map((c) => ({ ...c, flipped: false })))
    setPhase('playing')
    setPreviewSecondsLeft(0)
    startedAtRef.current = Date.now()
    timerRef.current = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }
    }, 1000)
  }, [clearTimers])

  const startPreview = useCallback(() => {
    clearTimers()
    const config = normalizeMemoryMatchSettings(draftSettings)
    saveMemoryMatchSettings(config)
    setActiveSettings(config)
    const fresh = buildDeck(newGameSeed(), config).map((c) => ({
      ...c,
      flipped: true,
    }))
    setDeck(fresh)
    setMoves(0)
    setElapsed(0)
    setLock(false)
    flippedRef.current = []
    startedAtRef.current = null
    const memorizeSec = config.memorizeSeconds
    setPreviewSecondsLeft(memorizeSec)
    setPreviewNonce((n) => n + 1)
    setPhase('preview')

    previewTickRef.current = window.setInterval(() => {
      setPreviewSecondsLeft((s) => {
        if (s <= 1) {
          if (previewTickRef.current) clearInterval(previewTickRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)

    previewTimerRef.current = window.setTimeout(() => {
      beginPlaying()
    }, memorizeSec * 1000)
  }, [clearTimers, beginPlaying, draftSettings])

  const matchedCount = deck.filter((c) => c.matched).length
  const won =
    matchedCount === deck.length && deck.length > 0 && phase === 'playing'

  useEffect(() => {
    if (won) {
      setPhase('won')
      clearTimers()
    }
  }, [won, clearTimers])

  const flipCard = useCallback(
    (cardId) => {
      if (lock || phase !== 'playing' || !activeSettings) return
      const card = deck.find((c) => c.id === cardId)
      if (!card || card.matched || card.flipped) return

      const { cardsPerSet } = activeSettings
      const nextDeck = deck.map((c) =>
        c.id === cardId ? { ...c, flipped: true } : c
      )
      setDeck(nextDeck)

      const open = [...flippedRef.current, cardId]
      flippedRef.current = open

      if (open.length < cardsPerSet) return

      setLock(true)
      const flippedCards = open.map((id) => nextDeck.find((c) => c.id === id))
      const firstId = flippedCards[0]?.skzooId
      const isMatch =
        flippedCards.length === cardsPerSet &&
        flippedCards.every((c) => c && c.skzooId === firstId)

      setMoves((m) => m + 1)

      if (isMatch) {
        setDeck((prev) =>
          prev.map((c) =>
            open.includes(c.id) ? { ...c, matched: true, flipped: true } : c
          )
        )
        flippedRef.current = []
        setLock(false)
        return
      }

      window.setTimeout(() => {
        setDeck((prev) =>
          prev.map((c) =>
            open.includes(c.id) ? { ...c, flipped: false } : c
          )
        )
        flippedRef.current = []
        setLock(false)
      }, MISMATCH_MS)
    },
    [deck, lock, phase, activeSettings]
  )

  const restart = useCallback(() => {
    clearTimers()
    setDeck([])
    setActiveSettings(null)
    setPhase('intro')
    setMoves(0)
    setElapsed(0)
    setLock(false)
    setPreviewSecondsLeft(draftSettings.memorizeSeconds)
    flippedRef.current = []
    startedAtRef.current = null
  }, [clearTimers, draftSettings.memorizeSeconds])

  const skipPreview = useCallback(() => {
    if (phase === 'preview') beginPlaying()
  }, [phase, beginPlaying])

  return {
    deck,
    phase,
    moves,
    elapsed,
    lock,
    flipCard,
    startPreview,
    skipPreview,
    restart,
    draftSettings,
    settings,
    updateDraftSettings,
    canEditSettings,
    setsRemaining,
    setCount: settings.setCount,
    cardsPerSet: settings.cardsPerSet,
    totalCards,
    gridColumns,
    previewSecondsLeft,
    previewTotalSeconds: settings.memorizeSeconds,
    previewNonce,
    memorizeSeconds: settings.memorizeSeconds,
  }
}
