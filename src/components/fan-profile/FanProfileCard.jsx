import { forwardRef } from 'react'
import { Disc3, Heart, Music2 } from 'lucide-react'
import { BANNER_MODES, findSkzoo, PROFILE_LAYOUTS } from '@/data/profileAssets'
import {
  buildCardColorOverlay,
  buildCardFrameGradient,
  buildCardPhotoBackdrop,
  normalizeProfileTheme,
} from '@/utils/profileTheme'
import { computeHeroPhotoFit } from '@/utils/heroPhotoFit'
import '@/styles/FanProfile.css'

const FanProfileCard = forwardRef(function FanProfileCard({ profile }, ref) {
  const theme = normalizeProfileTheme(profile)
  const {
    stayName,
    bio,
    bias,
    favouriteSong,
    favouriteEra,
    primaryColour,
    accentColour,
    gradientAngle,
    skzooId,
    profileLayout,
    bannerMode,
  } = theme

  const isBannerLayout = profileLayout === PROFILE_LAYOUTS.BANNER
  const hasPhoto = bannerMode === BANNER_MODES.IMAGE
  const photoFit = computeHeroPhotoFit(profileLayout)
  const photoBackdrop = buildCardPhotoBackdrop(theme, photoFit)
  const colorOverlay = buildCardColorOverlay(theme)
  const skzoo = findSkzoo(skzooId)
  const displayName = stayName?.trim() || 'Your Name'

  const stats = [
    bias?.trim() && {
      key: 'bias',
      icon: <Heart size={15} strokeWidth={2} aria-hidden />,
      value: bias.trim(),
      label: 'Bias',
    },
    favouriteEra && {
      key: 'era',
      icon: <Disc3 size={15} strokeWidth={2} aria-hidden />,
      value: favouriteEra,
      label: 'Era',
    },
    favouriteSong?.trim() && {
      key: 'song',
      icon: <Music2 size={15} strokeWidth={2} aria-hidden />,
      value: favouriteSong.trim(),
      label: 'Favourite song',
    },
    skzoo && {
      key: 'skzoo',
      icon: (
        <img
          src={skzoo.image}
          alt=""
          className="profile-card__stat-skzoo-icon"
          width={18}
          height={18}
        />
      ),
      value: skzoo.name,
      label: 'SKZOO',
    },
  ].filter(Boolean)

  return (
    <article
      className={`profile-card ${
        isBannerLayout ? 'profile-card--banner' : 'profile-card--portrait'
      }`}
      style={{
        '--card-primary': primaryColour,
        '--card-accent': accentColour,
        '--card-gradient-angle': `${gradientAngle}deg`,
      }}
    >
      <div
        ref={ref}
        className={`profile-card__frame ${
          hasPhoto && photoBackdrop ? 'profile-card__frame--has-photo' : ''
        }`}
        style={!hasPhoto || !photoBackdrop ? buildCardFrameGradient(theme) : undefined}
      >
        {hasPhoto && photoBackdrop && (
          <>
            <div
              className="profile-card__backdrop"
              style={photoBackdrop}
              aria-hidden="true"
            />
            <div
              className="profile-card__overlay"
              style={colorOverlay}
              aria-hidden="true"
            />
          </>
        )}

        <div className="profile-card__content">
          <div className="profile-card__hero">
            {skzoo && !isBannerLayout && (
              <img
                className="profile-card__skzoo"
                src={skzoo.image}
                alt={skzoo.name}
                width={140}
                height={140}
                crossOrigin="anonymous"
                decoding="async"
              />
            )}
          </div>

          <div className="profile-card__body">
            <header className="profile-card__identity">
              <p className="profile-card__kind">STAY profile</p>
              <h1 className="profile-card__title">{displayName}</h1>
            </header>

            {stats.length > 0 && (
              <ul className="profile-card__stats" aria-label="Profile details">
                {stats.map((item) => (
                  <li key={item.key} className="profile-card__stat">
                    <span className="profile-card__stat-icon" title={item.label}>
                      {item.icon}
                    </span>
                    <span className="profile-card__stat-value">{item.value}</span>
                  </li>
                ))}
              </ul>
            )}

            <div
              className={
                isBannerLayout
                  ? 'profile-card__about-split'
                  : 'profile-card__about-split profile-card__about-split--portrait'
              }
            >
              {isBannerLayout && skzoo && (
                <img
                  className="profile-card__skzoo profile-card__skzoo--banner"
                  src={skzoo.image}
                  alt={skzoo.name}
                  width={120}
                  height={120}
                  crossOrigin="anonymous"
                  decoding="async"
                />
              )}
              <section
                className="profile-card__about"
                aria-labelledby="profile-about-heading"
              >
                <h2 id="profile-about-heading" className="profile-card__about-heading">
                  About
                </h2>
                {bio?.trim() ? (
                  <p className="profile-card__bio">{bio}</p>
                ) : (
                  <p className="profile-card__bio profile-card__bio--empty">
                    Your STAY story goes here…
                  </p>
                )}
              </section>
            </div>

            {!isBannerLayout && (
              <footer className="profile-card__footer">
                <span className="profile-card__footer-mark">made on skzarcade.com</span>
              </footer>
            )}
          </div>

          {isBannerLayout && (
            <footer className="profile-card__footer profile-card__footer--banner-corner">
              <span className="profile-card__footer-mark">made on skzarcade.com</span>
            </footer>
          )}
        </div>
      </div>
    </article>
  )
})

export default FanProfileCard
