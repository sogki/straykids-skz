import { Navigate } from 'react-router-dom'

/** Legacy URL — player account lives at /profile. */
export default function PlayerLink() {
  return <Navigate to="/profile" replace />
}
