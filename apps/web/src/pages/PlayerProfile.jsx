import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Link2, LogOut, Trophy, Unplug } from 'lucide-react'
import DiscordIcon from '@/components/DiscordIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  applyPlayerSessionToken,
  consumePlayerOAuthCallback,
  discordAvatarUrl,
  fetchPlayerProfile,
  playerOAuthErrorMessage,
  signOutPlayer,
  startPlayerDiscordOAuth,
} from '@/services/skzPlayerAuth'
import { usePlayerSessionContext } from '@/context/PlayerSessionContext'

const DAILY_GAME_META = {
  'guess-song': { title: 'Daily Song Guess', path: '/guess-song', emoji: '🎵' },
  'guess-member': { title: 'Daily Member Guess', path: '/guess-member', emoji: '🎭' },
  'guess-lyric': { title: 'Daily Lyric Guess', path: '/guess-lyric', emoji: '📝' },
}

function gameMeta(slug) {
  return (
    DAILY_GAME_META[slug] ?? {
      title: slug,
      path: '/arcade',
      emoji: '🎮',
    }
  )
}

function formatPuzzleDate(isoDate) {
  if (!isoDate) return '—'
  try {
    return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

function formatLinkedAt(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

export default function PlayerProfile() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const { access, loading: bootLoading, reload } = usePlayerSessionContext()

  useEffect(() => {
    document.title = 'Player profile · SKZ Arcade'
  }, [])

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      setError(playerOAuthErrorMessage(oauthError))
    }
  }, [searchParams])

  useEffect(() => {
    const token = consumePlayerOAuthCallback()
    if (!token) return

    let cancelled = false
    setOauthBusy(true)
    setError(null)
    ;(async () => {
      try {
        await applyPlayerSessionToken(token)
        if (!cancelled) await reload()
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not finish Discord sign-in.')
        }
      } finally {
        if (!cancelled) setOauthBusy(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    if (!access) {
      setProfile(null)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    ;(async () => {
      try {
        const data = await fetchPlayerProfile()
        if (!cancelled) setProfile(data)
      } catch (err) {
        if (!cancelled) {
          setProfile(access)
          if (import.meta.env.DEV) {
            console.warn('[player profile]', err.message)
          }
        }
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [access])

  async function handleSignOut() {
    await signOutPlayer()
    await reload()
    setProfile(null)
  }

  const busy = bootLoading || oauthBusy
  const view = profile ?? access
  const history = profile?.daily_history ?? []
  const byGame = profile?.points_by_game ?? []
  const linkedLabel = formatLinkedAt(profile?.linked_at)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Player profile</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your Discord connection and global leaderboard points from daily puzzles.
        </p>
      </div>

      {busy ? (
        <p className="text-center text-sm text-zinc-500">Loading…</p>
      ) : view ? (
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-[#111116] text-zinc-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="size-5 text-violet-400" aria-hidden="true" />
                Connection
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Linked for the global player leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src={discordAvatarUrl(view.discord_user_id, view.avatar_hash, 96)}
                  alt=""
                  className="size-16 rounded-full ring-2 ring-emerald-500/40"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-white">
                    {view.discord_username || view.username}
                  </p>
                  <p className="text-sm text-zinc-500">Discord · {view.discord_user_id}</p>
                  {linkedLabel && (
                    <p className="mt-1 text-xs text-zinc-500">Linked {linkedLabel}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
                  <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  Connected
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-[#111116] text-zinc-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="size-5 text-amber-400" aria-hidden="true" />
                Points
              </CardTitle>
              <CardDescription className="text-zinc-400">
                1 point per correct daily answer on Song, Member, and Lyric guesses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <p className="text-sm text-zinc-500">Refreshing stats…</p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Total points</p>
                      <p className="text-2xl font-bold text-white">{view.total_points ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Global rank</p>
                      <p className="text-2xl font-bold text-white">
                        {view.global_rank ? `#${view.global_rank}` : '—'}
                      </p>
                    </div>
                  </div>

                  {byGame.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        By game
                      </p>
                      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                        {byGame.map((row) => {
                          const meta = gameMeta(row.game_slug)
                          return (
                            <li
                              key={row.game_slug}
                              className="flex items-center justify-between gap-3 px-3 py-2.5"
                            >
                              <Link
                                to={meta.path}
                                className="flex min-w-0 items-center gap-2 text-sm text-zinc-200 hover:text-violet-300"
                              >
                                <span aria-hidden="true">{meta.emoji}</span>
                                <span className="truncate">{meta.title}</span>
                              </Link>
                              <span className="shrink-0 text-sm text-zinc-400">
                                {row.total_points} pt{row.total_points === 1 ? '' : 's'}
                                <span className="text-zinc-600">
                                  {' '}
                                  · {row.days_played} day{row.days_played === 1 ? '' : 's'}
                                </span>
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  <Link
                    to="/"
                    className="inline-block text-sm text-violet-400 hover:underline"
                  >
                    View global leaderboard on home →
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-[#111116] text-zinc-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="size-5 text-sky-400" aria-hidden="true" />
                Recent daily scores
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Your last recorded wins on the daily puzzle leaderboard games.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No points yet. Win a daily Song, Member, or Lyric guess while signed in.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                  {history.map((row) => {
                    const meta = gameMeta(row.game_slug)
                    const key = `${row.game_slug}-${row.puzzle_date}`
                    return (
                      <li
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-200">
                            {meta.emoji} {meta.title}
                          </span>
                          <span className="ml-2 text-zinc-500">
                            {formatPuzzleDate(row.puzzle_date)}
                          </span>
                        </div>
                        <span className="text-zinc-300">
                          +{row.points} pt{row.points === 1 ? '' : 's'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Back to arcade
            </Button>
            <Button type="button" variant="outline" onClick={handleSignOut}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border-zinc-800 bg-[#111116] text-zinc-100">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
              <Unplug className="size-5 text-zinc-400" aria-hidden="true" />
            </div>
            <CardTitle>Connect Discord</CardTitle>
            <CardDescription className="text-zinc-400">
              Sign in to track points on the global leaderboard. You do not need to join our
              server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="discord"
              className="w-full"
              onClick={async () => {
                setError(null)
                try {
                  await startPlayerDiscordOAuth('/profile')
                } catch (err) {
                  setError(err.message || 'Could not start Discord sign-in.')
                }
              }}
            >
              <DiscordIcon size={20} />
              Continue with Discord
            </Button>
            <p className="text-center text-xs text-zinc-600">
              <Link to="/" className="text-violet-300 hover:underline">
                ← SKZ Arcade
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
