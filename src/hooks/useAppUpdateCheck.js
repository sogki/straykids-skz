import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'skz_app_build_version'
const FIRST_VISIT_SESSION_KEY = 'skz_app_first_visit_session'
const POLL_MS = 5 * 60 * 1000

async function fetchBuildVersion() {
  const res = await fetch(`/version.json?t=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('version fetch failed')
  const data = await res.json()
  return data?.version ? String(data.version) : null
}

function safeLocalGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

/**
 * Detects when a new deploy is live and prompts the user to refresh.
 *
 * First-time visitors never see the toast: on the very first check of a
 * session where no version was previously stored, we silently align the
 * stored version with the remote one and flag the session as "first visit"
 * so subsequent checks in the same session can't trigger the prompt either.
 */
export function useAppUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const knownRef = useRef(null)

  const check = useCallback(async () => {
    try {
      const remote = await fetchBuildVersion()
      if (!remote) return

      const stored = safeLocalGet(STORAGE_KEY)
      const firstVisitSession =
        safeSessionGet(FIRST_VISIT_SESSION_KEY) === '1'

      if (!stored) {
        safeLocalSet(STORAGE_KEY, remote)
        safeSessionSet(FIRST_VISIT_SESSION_KEY, '1')
        knownRef.current = remote
        return
      }

      if (firstVisitSession) {
        if (stored !== remote) safeLocalSet(STORAGE_KEY, remote)
        knownRef.current = remote
        return
      }

      if (stored !== remote) {
        setUpdateAvailable(true)
        return
      }

      knownRef.current = remote
    } catch {
      /* offline or missing file — ignore */
    }
  }, [])

  useEffect(() => {
    check()
    const id = window.setInterval(check, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  const refresh = useCallback(() => {
    fetchBuildVersion()
      .then((v) => {
        if (v) safeLocalSet(STORAGE_KEY, v)
        window.location.reload()
      })
      .catch(() => window.location.reload())
  }, [])

  const dismiss = useCallback(() => {
    fetchBuildVersion()
      .then((v) => {
        if (v) safeLocalSet(STORAGE_KEY, v)
        setUpdateAvailable(false)
      })
      .catch(() => setUpdateAvailable(false))
  }, [])

  return { updateAvailable, refresh, dismiss }
}
