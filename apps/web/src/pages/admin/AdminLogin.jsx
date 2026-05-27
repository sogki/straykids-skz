import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  setStoredAdminCode,
  verifyStaffCode,
} from '@/services/skzAdmin'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const ok = await verifyStaffCode(code)
      if (!ok) {
        setError('Invalid staff code.')
        return
      }
      setStoredAdminCode(code.trim())
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not verify code. Run the latest migration?')
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
            Enter the staff code from the{' '}
            <code className="text-xs text-violet-300">skz_admin_staff</code> table
            (change it only in Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-code">Staff code</Label>
              <Input
                id="staff-code"
                type="password"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
              {loading ? 'Checking…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
