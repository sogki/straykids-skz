import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Gamepad2 } from 'lucide-react'
import DiscordIcon from '@/components/DiscordIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  applyPlayerSessionToken,
  consumePlayerOAuthCallback,
  discordAvatarUrl,
  playerOAuthErrorMessage,
  signOutPlayer,
  startPlayerDiscordOAuth,
} from '@/services/skzPlayerAuth'
import { usePlayerSessionContext } from '@/context/PlayerSessionContext'

export default function PlayerLink() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(null)
  const [oauthBusy, setOauthBusy] = useState(false)
  const { access, loading: bootLoading, reload } = usePlayerSessionContext()

  useEffect(() => {
    document.title = 'Link Discord · SKZ Arcade'
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

  async function handleSignOut() {
    await signOutPlayer()
    await reload()
  }

  const busy = bootLoading || oauthBusy

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <Card className="border-zinc-800 bg-[#111116] text-zinc-100">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
            <Gamepad2 size={20} className="text-violet-300" />
          </div>
          <CardTitle>Link Discord</CardTitle>
          <CardDescription className="text-zinc-400">
            Connect for the <strong className="font-medium text-zinc-300">global player</strong>{' '}
            leaderboard. Use the same Discord account anywhere — you do not need to join our
            server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {busy ? (
            <p className="text-center text-sm text-zinc-500">Signing in…</p>
          ) : access ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
                <img
                  src={discordAvatarUrl(access.discord_user_id, access.avatar_hash, 80)}
                  alt=""
                  className="size-12 rounded-full"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-100">
                    {access.discord_username || access.username}
                  </p>
                  <p className="text-sm text-emerald-200/80">
                    {access.total_points ?? 0} points
                    {access.global_rank ? ` · #${access.global_rank} globally` : ''}
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Earn <strong className="text-zinc-400">1 point</strong> per correct daily answer on
                Song, Member, and Lyric guesses.
              </p>
              <Button type="button" className="w-full" onClick={() => navigate('/')}>
                Back to arcade
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="discord"
                className="w-full"
                onClick={async () => {
                  setError(null)
                  try {
                    await startPlayerDiscordOAuth('/link')
                  } catch (err) {
                    setError(err.message || 'Could not start Discord sign-in.')
                  }
                }}
              >
                <DiscordIcon size={20} />
                Continue with Discord
              </Button>
              <p className="text-xs text-zinc-500">
                You will be redirected to Discord to authorize SKZ Arcade. We only request your
                profile (username and avatar) for the leaderboard.
              </p>
            </>
          )}

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <p className="text-center text-xs text-zinc-600">
            <Link to="/" className="text-violet-300 hover:underline">
              ← SKZ Arcade
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
