import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ADMIN_DISCORD_SLASH_COMMAND,
  bootstrapAdminSession,
  exchangeDiscordLoginCode,
  signOutAdminAuth,
} from '@/services/skzAdmin'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [loginCode, setLoginCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [access, setAccess] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { access: nextAccess } = await bootstrapAdminSession()
        if (!active) return
        setAccess(nextAccess)
        if (nextAccess?.permission_level === 'full_admin') navigate('/admin', { replace: true })
        if (nextAccess?.permission_level === 'moderator') {
          navigate('/admin/bot', { replace: true })
        }
      } catch {
        if (!active) return
      }
    })()
    return () => {
      active = false
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await exchangeDiscordLoginCode(loginCode)
      setAccess(result)
      if (result?.permission_level === 'full_admin') navigate('/admin', { replace: true })
      else if (result?.permission_level === 'moderator') {
        navigate('/admin/bot', { replace: true })
      } else {
        setError('Your code is valid but has no mapped permissions.')
      }
    } catch (err) {
      setError(err.message || 'Could not exchange login code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-shell">
      <Card className="admin-login-card w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Lock size={18} />
          </div>
          <CardTitle>SKZ Admin</CardTitle>
          <CardDescription>
            Run{' '}
            <code className="text-xs text-violet-300">/{ADMIN_DISCORD_SLASH_COMMAND}</code> in
            Discord, then
            enter the one-time code below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {access && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Signed in as Discord user. Permission: {access?.permission_level || 'none'}.
              </div>
            )}

            {!access && (
              <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-zinc-800 p-3">
                <div className="space-y-2">
                  <Label htmlFor="discord-login-code">Discord login code</Label>
                  <Input
                    id="discord-login-code"
                    type="text"
                    autoComplete="off"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                    placeholder="AB12CD34"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !loginCode.trim()}>
                  {loading ? 'Checking…' : 'Sign in'}
                </Button>
              </form>
            )}

            {access?.permission_level === 'moderator' && (
              <Button type="button" className="w-full" onClick={() => navigate('/admin/bot', { replace: true })}>
                Open Moderator Panel
              </Button>
            )}

            {access && (
              <Button type="button" variant="outline" className="w-full" onClick={signOutAdminAuth}>
                Sign out
              </Button>
            )}

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            {access?.permission_level === 'none' && (
              <p className="text-sm text-amber-300">
                Your Discord roles are not mapped to admin permissions.
              </p>
            )}
            {!access && (
              <p className="text-xs text-zinc-500">
                The one-time code expires in 5 minutes and can only be used once.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
