import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { fetchPublicSettings } from '../services/skzSettings'
import { fetchGames } from '../services/skzGames'
import { fetchDailySongPool } from '../services/skzDaily'
import { resolveSupabaseCredentials } from '../lib/supabase/bootstrap'
import { resolveSkzAssetUrl } from '../lib/supabase/storage'
import { games as fallbackGames } from '../data/games'
import { dailySongs as fallbackDailySongs } from '../data/dailySongs'
import { SITE_LOGOS } from '../data/site'
import { getStorageBucketFromEnv } from '../lib/supabase/credentials'

const SkzDataContext = createContext(null)

const INITIAL_SETTINGS = {
  site_title: 'SKZ Arcade',
  site_tagline: 'Daily puzzles and minigames for STAYs',
  site_logo_url: SITE_LOGOS.white,
  site_logo_black_url: SITE_LOGOS.black,
  hero_image_url: '',
  max_daily_guesses: '5',
  storage_bucket: getStorageBucketFromEnv(),
  _loadedFromDb: false,
}

export function SkzDataProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [supabaseUrl, setSupabaseUrl] = useState(null)
  const [games, setGames] = useState(fallbackGames)
  const [dailyPool, setDailyPool] = useState(fallbackDailySongs)

  const resolveAsset = useCallback(
    (urlOrPath) => {
      if (!urlOrPath || !supabaseUrl) return null
      return resolveSkzAssetUrl(
        urlOrPath,
        supabaseUrl,
        settings?.storage_bucket || 'skz_arcade'
      )
    },
    [supabaseUrl, settings?.storage_bucket]
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { url } = await resolveSupabaseCredentials()
      setSupabaseUrl(url)

      const s = await fetchPublicSettings()
      setSettings(s)

      const bucket = s.storage_bucket || 'skz_arcade'
      const [g, pool] = await Promise.all([
        fetchGames(url, bucket),
        fetchDailySongPool(),
      ])
      setGames(g)
      setDailyPool(pool)
    } catch (err) {
      setError(err.message)
      setSettings((prev) => prev ?? INITIAL_SETTINGS)
      setGames(fallbackGames)
      setDailyPool(fallbackDailySongs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo(
    () => ({
      loading,
      error,
      settings,
      supabaseUrl,
      games,
      dailyPool,
      resolveAsset,
      reload,
    }),
    [loading, error, settings, supabaseUrl, games, dailyPool, resolveAsset, reload]
  )

  return (
    <SkzDataContext.Provider value={value}>{children}</SkzDataContext.Provider>
  )
}

export function useSkzData() {
  const ctx = useContext(SkzDataContext)
  if (!ctx) throw new Error('useSkzData must be used within SkzDataProvider')
  return ctx
}
