import { RefreshCw, X } from 'lucide-react'
import { useAppUpdateCheck } from '@/hooks/useAppUpdateCheck'
import '@/styles/AppUpdateToast.css'

export default function AppUpdateToast() {
  const { updateAvailable, refresh, dismiss } = useAppUpdateCheck()

  if (!updateAvailable) return null

  return (
    <div
      className="skz-update-toast"
      role="status"
      aria-live="polite"
      aria-label="Site update available"
    >
      <div className="skz-update-toast__body">
        <p className="skz-update-toast__title">Update available</p>
        <p className="skz-update-toast__text">
          New puzzles and features are live. Refresh to load the latest version.
        </p>
        <div className="skz-update-toast__actions">
          <button type="button" className="skz-update-toast__primary" onClick={refresh}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh page
          </button>
          <button
            type="button"
            className="skz-update-toast__ghost"
            onClick={dismiss}
            aria-label="Dismiss update notice"
          >
            Later
          </button>
        </div>
      </div>
      <button
        type="button"
        className="skz-update-toast__close"
        onClick={dismiss}
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  )
}
