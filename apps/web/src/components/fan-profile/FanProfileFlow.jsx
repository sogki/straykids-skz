import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { SKZ_ERAS } from '@/data/skzEras'
import {
  BANNER_MODES,
  GRADIENT_PRESETS,
  PROFILE_LAYOUT_OPTIONS,
  PROFILE_LAYOUTS,
  STRAY_KIDS_PHOTOS,
  STRAY_KIDS_PHOTOS_PER_PAGE,
  STRAY_KIDS_PHOTO_COUNT,
  SKZOO_CHARACTERS,
} from '@/data/profileAssets'
import { FAN_PROFILE_STEPS, clampFanProfileStepIndex } from '@/data/fanProfileSteps'
import { getGradientPresetForEra } from '@/data/skzGradientPresets'
import {
  applyGradientPreset,
  buildPresetSwatchStyle,
  formatCardGradient,
} from '@/utils/profileTheme'
import gameStyles from '@/styles/GamePage.module.css'

export default function FanProfileFlow({
  form,
  onChange,
  stepIndex,
  onStepChange,
  onSave,
  onClear,
  onExport,
  exporting,
  hasStored,
  saved,
}) {
  const [photoPage, setPhotoPage] = useState(1)
  const safeStepIndex = clampFanProfileStepIndex(stepIndex)
  const step = FAN_PROFILE_STEPS[safeStepIndex]
  const isFirst = safeStepIndex === 0
  const isLast = safeStepIndex === FAN_PROFILE_STEPS.length - 1

  function patch(updates) {
    onChange((f) => ({ ...f, ...updates }))
  }

  function goNext() {
    if (!isLast) onStepChange(safeStepIndex + 1)
  }

  function goBack() {
    if (!isFirst) onStepChange(safeStepIndex - 1)
  }

  function selectGradientPreset(presetId) {
    const next = applyGradientPreset(presetId)
    if (next) patch(next)
  }

  function selectFavouriteEra(era) {
    const preset = getGradientPresetForEra(era)
    const presetPatch = preset ? applyGradientPreset(preset.id) : {}
    patch({ favouriteEra: era, ...presetPatch })
  }

  const {
    profileLayout,
    bannerMode,
    primaryColour,
    accentColour,
    gradientAngle,
    gradientPresetId,
    backgroundId,
    skzooId,
  } = form

  const photoPageCount = Math.max(
    1,
    Math.ceil(STRAY_KIDS_PHOTOS.length / STRAY_KIDS_PHOTOS_PER_PAGE)
  )
  const safePhotoPage = Math.min(photoPage, photoPageCount)
  const photoSliceStart = (safePhotoPage - 1) * STRAY_KIDS_PHOTOS_PER_PAGE
  const photoSlice = STRAY_KIDS_PHOTOS.slice(
    photoSliceStart,
    photoSliceStart + STRAY_KIDS_PHOTOS_PER_PAGE
  )

  useEffect(() => {
    if (safeStepIndex !== stepIndex) onStepChange(safeStepIndex)
  }, [safeStepIndex, stepIndex, onStepChange])

  useEffect(() => {
    if (bannerMode !== BANNER_MODES.IMAGE) return
    if (backgroundId) {
      const idx = STRAY_KIDS_PHOTOS.findIndex((p) => p.id === backgroundId)
      if (idx >= 0) {
        setPhotoPage(Math.floor(idx / STRAY_KIDS_PHOTOS_PER_PAGE) + 1)
        return
      }
    }
    setPhotoPage(1)
  }, [bannerMode, backgroundId])

  return (
    <div className="fan-profile-flow">
      <div className={`${gameStyles.panel} fan-profile-flow__panel`}>
        <header className="fan-profile-flow__header">
          <p className="fan-profile-flow__eyebrow">
            Step {safeStepIndex + 1} of {FAN_PROFILE_STEPS.length}
          </p>
          <h2 className="fan-profile-flow__title">{step.title}</h2>
        </header>

        <div className="fan-profile-flow__content">
          {step.id === 'you' && (
            <>
              <div className="fan-profile-field">
                <label className={gameStyles.label} htmlFor="stayName">
                  Display name
                </label>
                <input
                  id="stayName"
                  type="text"
                  className={gameStyles.input}
                  placeholder="How you want to appear"
                  value={form.stayName}
                  onChange={(e) => patch({ stayName: e.target.value })}
                />
              </div>
              <div className={gameStyles.formGrid}>
                <div>
                  <label className={gameStyles.label} htmlFor="bias">
                    Bias
                  </label>
                  <input
                    id="bias"
                    type="text"
                    className={gameStyles.input}
                    placeholder="Your bias"
                    value={form.bias}
                    onChange={(e) => patch({ bias: e.target.value })}
                  />
                </div>
                <div>
                  <label className={gameStyles.label} htmlFor="favEra">
                    Era
                  </label>
                  <select
                    id="favEra"
                    className={gameStyles.select}
                    value={form.favouriteEra}
                    onChange={(e) => selectFavouriteEra(e.target.value)}
                  >
                    {SKZ_ERAS.map((era) => (
                      <option key={era} value={era}>
                        {era}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fullWidth">
                  <label className={gameStyles.label} htmlFor="favSong">
                    Favourite song
                  </label>
                  <input
                    id="favSong"
                    type="text"
                    className={gameStyles.input}
                    placeholder="Track title"
                    value={form.favouriteSong}
                    onChange={(e) => patch({ favouriteSong: e.target.value })}
                  />
                </div>
              </div>
              <div className="fan-profile-field">
                <label className={gameStyles.label} htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  className={`${gameStyles.input} ${gameStyles.textarea}`}
                  placeholder="STAY since…, ult line, concert memories…"
                  rows={4}
                  maxLength={190}
                  value={form.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                />
              </div>
            </>
          )}

          {step.id === 'skzoo' && (
            <div className="fan-profile-skzoo-grid fan-profile-skzoo-grid--flow" role="list">
              {SKZOO_CHARACTERS.map((char) => {
                const active = skzooId === char.id
                return (
                  <button
                    key={char.id}
                    type="button"
                    role="listitem"
                    className={`fan-profile-skzoo-btn fan-profile-skzoo-btn--large ${
                      active ? 'fan-profile-skzoo-btn--active' : ''
                    }`}
                    style={{ '--skzoo-color': char.color }}
                    title={`${char.name} (${char.member})`}
                    aria-pressed={active}
                    onClick={() =>
                      patch({ skzooId: skzooId === char.id ? null : char.id })
                    }
                  >
                    <img
                      src={char.image}
                      alt=""
                      width={64}
                      height={64}
                      crossOrigin="anonymous"
                      decoding="async"
                    />
                    <span className="fan-profile-skzoo-btn__name">{char.name}</span>
                    <span className="fan-profile-skzoo-btn__member">{char.member}</span>
                  </button>
                )
              })}
            </div>
          )}

          {step.id === 'layout' && (
            <div
              className="fan-profile-layout-grid"
              role="radiogroup"
              aria-label="Card layout"
            >
              {PROFILE_LAYOUT_OPTIONS.map((option) => {
                const active =
                  (profileLayout ?? PROFILE_LAYOUTS.PORTRAIT) === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`fan-profile-layout-btn ${
                      active ? 'fan-profile-layout-btn--active' : ''
                    } fan-profile-layout-btn--${option.id}`}
                    style={{
                      '--layout-preview-primary': primaryColour,
                      '--layout-preview-accent': accentColour,
                    }}
                    onClick={() => patch({ profileLayout: option.id })}
                  >
                    <span className="fan-profile-layout-btn__preview" aria-hidden="true">
                      <span className="fan-profile-layout-btn__preview-hero" />
                      <span className="fan-profile-layout-btn__preview-body">
                        <span className="fan-profile-layout-btn__preview-line fan-profile-layout-btn__preview-line--title" />
                        <span className="fan-profile-layout-btn__preview-line fan-profile-layout-btn__preview-line--short" />
                        <span className="fan-profile-layout-btn__preview-line" />
                      </span>
                    </span>
                    <span className="fan-profile-layout-btn__name">
                      {option.name}
                    </span>
                    <span className="fan-profile-layout-btn__desc">
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {step.id === 'banner' && (
            <>
              <div
                className="fan-profile-mode-tabs"
                role="tablist"
                aria-label="Background type"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={bannerMode === BANNER_MODES.GRADIENT}
                  className={`fan-profile-mode-tab ${
                    bannerMode === BANNER_MODES.GRADIENT
                      ? 'fan-profile-mode-tab--active'
                      : ''
                  }`}
                  onClick={() => patch({ bannerMode: BANNER_MODES.GRADIENT })}
                >
                  Gradient
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bannerMode === BANNER_MODES.IMAGE}
                  className={`fan-profile-mode-tab ${
                    bannerMode === BANNER_MODES.IMAGE
                      ? 'fan-profile-mode-tab--active'
                      : ''
                  }`}
                  onClick={() =>
                    patch({
                      bannerMode: BANNER_MODES.IMAGE,
                      backgroundId: backgroundId ?? STRAY_KIDS_PHOTOS[0]?.id,
                    })
                  }
                >
                  Stray Kids Photos
                </button>
              </div>

              {bannerMode === BANNER_MODES.GRADIENT ? (
                <div className="fan-profile-gradient-grid fan-profile-gradient-grid--flow">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`fan-profile-gradient-btn ${
                        gradientPresetId === preset.id
                          ? 'fan-profile-gradient-btn--active'
                          : ''
                      }`}
                      title={preset.name}
                      aria-pressed={gradientPresetId === preset.id}
                      onClick={() => selectGradientPreset(preset.id)}
                    >
                      <span
                        className="fan-profile-gradient-btn__swatch"
                        style={buildPresetSwatchStyle(preset)}
                      />
                      <span className="fan-profile-gradient-btn__label">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <p className="fan-profile-hint">
                    {STRAY_KIDS_PHOTO_COUNT} photos from the official{' '}
                    <a
                      href="https://straykids.jype.com/Default/Gallery"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Stray Kids gallery
                    </a>
                    .
                  </p>
                  <div
                    className={`fan-profile-bg-grid fan-profile-bg-grid--flow fan-profile-bg-grid--layout-${
                      profileLayout === PROFILE_LAYOUTS.BANNER ? 'banner' : 'portrait'
                    }`}
                  >
                    {photoSlice.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        className={`fan-profile-bg-btn ${
                          backgroundId === bg.id ? 'fan-profile-bg-btn--active' : ''
                        }`}
                        aria-label={bg.name}
                        aria-pressed={backgroundId === bg.id}
                        onClick={() =>
                          patch({
                            bannerMode: BANNER_MODES.IMAGE,
                            backgroundId: bg.id,
                          })
                        }
                      >
                        <img src={bg.image} alt="" loading="lazy" decoding="async" />
                        <span className="fan-profile-bg-btn__label">{bg.name}</span>
                      </button>
                    ))}
                  </div>
                  {photoPageCount > 1 && (
                    <nav
                      className="fan-profile-photos-pagination"
                      aria-label="Stray Kids Photos pagination"
                    >
                      <button
                        type="button"
                        className="fan-profile-photos-pagination__btn"
                        disabled={safePhotoPage <= 1}
                        onClick={() => setPhotoPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={16} aria-hidden />
                        Previous
                      </button>
                      <span className="fan-profile-photos-pagination__status">
                        Page {safePhotoPage} of {photoPageCount}
                      </span>
                      <button
                        type="button"
                        className="fan-profile-photos-pagination__btn"
                        disabled={safePhotoPage >= photoPageCount}
                        onClick={() =>
                          setPhotoPage((p) => Math.min(photoPageCount, p + 1))
                        }
                      >
                        Next
                        <ChevronRight size={16} aria-hidden />
                      </button>
                    </nav>
                  )}
                </>
              )}
            </>
          )}

          {step.id === 'style' && (
            <>
              <div className="fan-profile-colour-row">
                <div className="fan-profile-colour-field">
                  <label className={gameStyles.label} htmlFor="primaryColour">
                    Main colour
                  </label>
                  <div className="fan-profile-colour-input">
                    <input
                      id="primaryColour"
                      type="color"
                      value={primaryColour}
                      onChange={(e) =>
                        patch({
                          primaryColour: e.target.value,
                          favouriteColour: e.target.value,
                        })
                      }
                    />
                    <span className="fan-profile-colour-hex">{primaryColour}</span>
                  </div>
                </div>
                <div className="fan-profile-colour-field">
                  <label className={gameStyles.label} htmlFor="accentColour">
                    Accent colour
                  </label>
                  <div className="fan-profile-colour-input">
                    <input
                      id="accentColour"
                      type="color"
                      value={accentColour}
                      onChange={(e) => patch({ accentColour: e.target.value })}
                    />
                    <span className="fan-profile-colour-hex">{accentColour}</span>
                  </div>
                </div>
              </div>

              <div className="fan-profile-field">
                <span className={gameStyles.label}>Album colour presets</span>
                <p className="fan-profile-hint">
                  Matched to each release&apos;s artwork — same colours as the
                  Background step.
                </p>
                <div className="fan-profile-gradient-grid fan-profile-gradient-grid--flow">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={`style-${preset.id}`}
                      type="button"
                      className={`fan-profile-gradient-btn ${
                        gradientPresetId === preset.id
                          ? 'fan-profile-gradient-btn--active'
                          : ''
                      }`}
                      title={preset.name}
                      aria-pressed={gradientPresetId === preset.id}
                      onClick={() => selectGradientPreset(preset.id)}
                    >
                      <span
                        className="fan-profile-gradient-btn__swatch"
                        style={buildPresetSwatchStyle(preset)}
                      />
                      <span className="fan-profile-gradient-btn__label">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="fan-profile-angle fan-profile-field">
                <div className="fan-profile-angle__head">
                  <label className={gameStyles.label} htmlFor="gradientAngle">
                    Gradient angle
                  </label>
                  <span className="fan-profile-angle__value" aria-live="polite">
                    {gradientAngle}°
                  </span>
                </div>
                <div
                  className="fan-profile-angle__preview"
                  aria-hidden="true"
                  style={{
                    background: formatCardGradient({
                      primaryColour,
                      accentColour,
                      gradientAngle,
                    }),
                  }}
                />
                <div className="fan-profile-angle__track">
                  <input
                    id="gradientAngle"
                    type="range"
                    className="fan-profile-angle__range"
                    min={0}
                    max={360}
                    step={1}
                    value={gradientAngle}
                    onChange={(e) =>
                      patch({ gradientAngle: Number(e.target.value) })
                    }
                    aria-valuemin={0}
                    aria-valuemax={360}
                    aria-valuenow={gradientAngle}
                  />
                </div>
                <p className="fan-profile-angle__hint">
                  Rotates the colour fade on your card and photo overlay.
                </p>
              </div>
            </>
          )}

          {step.id === 'finish' && (
            <div className="fan-profile-finish">
              <p className="fan-profile-finish__text">
                Your card is ready in the live preview. Download a 2× PNG to share,
                or save your choices in this browser for next time.
              </p>
              <button
                type="button"
                className={`${gameStyles.btn} ${gameStyles.btnPrimary} ${gameStyles.btnFull} fan-profile-finish__download`}
                onClick={onExport}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <Loader2 size={18} className={gameStyles.spin} />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download PNG
                  </>
                )}
              </button>
              {saved && (
                <p className={gameStyles.savedBanner}>Saved to this browser.</p>
              )}
              <div className={`${gameStyles.btnRow} fan-profile-finish__secondary`}>
                <button
                  type="button"
                  className={`${gameStyles.btn} fan-profile-finish__save`}
                  onClick={onSave}
                >
                  Save profile
                </button>
                {hasStored && (
                  <button
                    type="button"
                    className={`${gameStyles.btn} ${gameStyles.btnDanger}`}
                    onClick={onClear}
                  >
                    Reset all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="fan-profile-flow__nav">
          <button
            type="button"
            className={`${gameStyles.btn} fan-profile-flow__nav-btn`}
            onClick={goBack}
            disabled={isFirst}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </button>
          {!isLast ? (
            <button
              type="button"
              className={`${gameStyles.btn} ${gameStyles.btnPrimary} fan-profile-flow__nav-btn`}
              onClick={goNext}
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <span className="fan-profile-flow__nav-spacer" />
          )}
        </footer>
      </div>
    </div>
  )
}
