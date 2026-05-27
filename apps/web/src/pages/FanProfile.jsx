import { useState, useEffect, useRef } from 'react'
import { captureProfileCardPng } from '@/utils/exportProfileCard'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import {
  BANNER_MODES,
  PROFILE_LAYOUTS,
  findImageBackground,
  findSkzoo,
} from '@/data/profileAssets'
import GameShell from '../components/GameShell'
import FanProfileCard from '../components/fan-profile/FanProfileCard'
import FanProfilePreviewTilt from '../components/fan-profile/FanProfilePreviewTilt'
import FanProfileFlow from '../components/fan-profile/FanProfileFlow'
import FanProfileStepSidebar from '../components/fan-profile/FanProfileStepSidebar'
import { clampFanProfileStepIndex } from '@/data/fanProfileSteps'
import { loadProfile, saveProfile, clearProfile } from '../utils/storage'
import { normalizeProfileTheme } from '@/utils/profileTheme'
import gameStyles from '../styles/GamePage.module.css'
import '@/styles/FanProfile.css'

const emptyForm = {
  stayName: '',
  bio: '',
  bias: '',
  favouriteSong: '',
  favouriteEra: 'NOEASY',
  ...normalizeProfileTheme(null),
}

function normalizeStored(stored) {
  if (!stored) return emptyForm
  const merged = {
    ...emptyForm,
    ...stored,
    ...normalizeProfileTheme(stored),
    bio: stored.bio ?? '',
  }
  if (!merged.favouriteEra || merged.favouriteEra === 'Other') {
    merged.favouriteEra = emptyForm.favouriteEra
  }
  return merged
}

function collectAssetUrls(profile) {
  const urls = []
  const skzoo = findSkzoo(profile.skzooId)
  if (skzoo?.image) urls.push(skzoo.image)
  if (profile.bannerMode === BANNER_MODES.IMAGE && profile.backgroundId) {
    const bg = findImageBackground(profile.backgroundId)
    if (bg?.image) urls.push(bg.image)
  }
  return urls
}

function preloadImages(urls) {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image()
          if (src.startsWith('http')) img.crossOrigin = 'anonymous'
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
        })
    )
  )
}

export default function FanProfile() {
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState(false)
  const [hasStored, setHasStored] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const cardRef = useRef(null)
  const isBannerLayout = form.profileLayout === PROFILE_LAYOUTS.BANNER

  function setStepIndexSafe(next) {
    setStepIndex(typeof next === 'function' ? (prev) => clampFanProfileStepIndex(next(prev)) : clampFanProfileStepIndex(next))
  }

  useEffect(() => {
    setStepIndex((prev) => clampFanProfileStepIndex(prev))
  }, [])

  useEffect(() => {
    trackGameStart('fan-profile')
    const stored = loadProfile()
    if (stored) {
      let normalized = normalizeStored(stored)
      if (
        normalized.bannerMode === BANNER_MODES.IMAGE &&
        !normalized.backgroundId
      ) {
        normalized = { ...normalized, backgroundId: '10-do-it-do' }
      }
      setForm(normalized)
      setHasStored(true)
    }
  }, [])

  function handleSave() {
    saveProfile(form)
    trackGameComplete('fan-profile', { saved: true })
    setHasStored(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleClear() {
    clearProfile()
    setForm(emptyForm)
    setHasStored(false)
    setSaved(false)
  }

  async function handleExport() {
    const frame = cardRef.current
    if (!frame) return
    setExporting(true)
    try {
      await preloadImages(collectAssetUrls(form))
      const dataUrl = await captureProfileCardPng(frame, {
        backgroundColor: form.primaryColour ?? '#5865F2',
      })
      const slug =
        form.stayName?.trim().replace(/\s+/g, '-').toLowerCase() || 'stay'
      const link = document.createElement('a')
      link.download = `skz-stay-pass-${slug}.png`
      link.href = dataUrl
      link.click()
      trackGameComplete('fan-profile', { exported: true })
    } catch (err) {
      console.error('Profile export failed', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <GameShell
      fanProfileStudio
      emoji="✨"
      accent="#ef4444"
      title="Fan Profile Maker"
      subtitle="Design your STAY profile card — portrait or banner layout, SKZOO buddy, Stray Kids photos, colours, and favorites."
    >
      <div
        className={`fan-profile-layout ${
          isBannerLayout ? 'fan-profile-layout--banner' : ''
        }`}
        style={{ '--game-accent': '#ef4444' }}
      >
        <FanProfileStepSidebar
          stepIndex={stepIndex}
          onStepChange={setStepIndexSafe}
        />

        <FanProfileFlow
          form={form}
          onChange={setForm}
          stepIndex={stepIndex}
          onStepChange={setStepIndexSafe}
          onSave={handleSave}
          onClear={handleClear}
          onExport={handleExport}
          exporting={exporting}
          hasStored={hasStored}
          saved={saved}
        />

        <aside className="fan-profile-preview-col" aria-label="Live preview">
          <p className="fan-profile-preview-label">Live preview</p>
          <FanProfilePreviewTilt disabled={exporting}>
            <div
              className={`fan-profile-preview-shell ${
                isBannerLayout ? 'fan-profile-preview-shell--banner' : ''
              }`}
            >
              <FanProfileCard ref={cardRef} profile={form} />
            </div>
          </FanProfilePreviewTilt>
          <p className="fan-profile-export-hint">
            Updates as you edit each step. Download your PNG on the Finish step.
          </p>
        </aside>
      </div>
    </GameShell>
  )
}
