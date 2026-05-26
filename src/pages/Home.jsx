import { useSkzData } from '@/context/SkzDataContext'
import { getHeroImageUrl, getHeroDebugInfo } from '@/services/skzSettings'
import HomeHero from '@/components/home/HomeHero'
import HomeArcadeHub from '@/components/home/HomeArcadeHub'
import HomeHowItWorks from '@/components/home/HomeHowItWorks'

export default function Home() {
  const { settings, supabaseUrl, games, loading, error } = useSkzData()

  const heroImage = getHeroImageUrl(settings, supabaseUrl)
  const heroDebug = import.meta.env.DEV
    ? getHeroDebugInfo(settings, supabaseUrl)
    : null
  const title = settings?.site_title || 'SKZ Arcade'
  const tagline =
    settings?.site_tagline ||
    'Daily puzzles and minigames for STAYs'
  const maxGuesses = settings?.max_daily_guesses || '5'
  const showSetupHint =
    import.meta.env.DEV && !settings?._loadedFromDb && !error

  return (
    <div className="w-full">
      <HomeHero
        title={title}
        tagline={tagline}
        heroImage={heroImage}
        maxGuesses={maxGuesses}
      />
      <HomeArcadeHub games={games} loading={loading} />
      <HomeHowItWorks />

      {(showSetupHint || error || (import.meta.env.DEV && !heroImage && heroDebug)) && (
        <div className="mx-auto max-w-[1120px] space-y-3 px-5 pb-10">
          {showSetupHint && (
            <p className="rounded-lg border border-skz-border bg-skz-surface px-4 py-3 text-sm text-skz-muted">
              Dev: settings not loaded from DB — run Supabase migrations or check
              .env.
            </p>
          )}
          {error && (
            <p
              className="rounded-lg border border-skz-border bg-skz-surface px-4 py-3 text-sm text-skz-muted"
              role="status"
            >
              Using offline fallbacks — {error}
            </p>
          )}
          {import.meta.env.DEV && !heroImage && heroDebug && (
            <details className="rounded-lg border border-skz-border bg-skz-surface px-4 py-3 text-sm text-skz-muted">
              <summary>Hero debug (dev)</summary>
              <ul className="mt-2 list-inside list-disc">
                <li>DB: {String(heroDebug.connected)}</li>
                <li>hero_image_url: {heroDebug.rawHeroValue}</li>
                <li>Resolved: {heroDebug.resolvedUrl}</li>
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
