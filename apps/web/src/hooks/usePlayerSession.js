import { useCallback, useEffect, useState } from 'react'
import {
  bootstrapPlayerSession,
  fetchPlayerStats,
  getStoredPlayerAccess,
  signOutPlayer,
} from '@/services/skzPlayerAuth'

export function usePlayerSession({ refreshStats = false } = {}) {
  const [access, setAccess] = useState(() => getStoredPlayerAccess())
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const { access: next } = await bootstrapPlayerSession()
    if (next && refreshStats) {
      try {
        const stats = await fetchPlayerStats()
        setAccess(stats ?? next)
      } catch {
        setAccess(next)
      }
    } else {
      setAccess(next)
    }
    setLoading(false)
  }, [refreshStats])

  useEffect(() => {
    reload()
  }, [reload])

  async function signOut() {
    await signOutPlayer()
    setAccess(null)
  }

  return { access, loading, reload, signOut, isLinked: Boolean(access?.session_token) }
}
