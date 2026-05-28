import { createContext, useContext } from 'react'
import { usePlayerSession } from '@/hooks/usePlayerSession'

const PlayerSessionContext = createContext(null)

export function PlayerSessionProvider({ children }) {
  const value = usePlayerSession({ refreshStats: true })
  return (
    <PlayerSessionContext.Provider value={value}>
      {children}
    </PlayerSessionContext.Provider>
  )
}

export function usePlayerSessionContext() {
  const ctx = useContext(PlayerSessionContext)
  if (!ctx) {
    throw new Error('usePlayerSessionContext must be used within PlayerSessionProvider')
  }
  return ctx
}
