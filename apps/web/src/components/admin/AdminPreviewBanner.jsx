import { Eye, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearAdminPreview } from '@/services/adminPreview'
import { useAdminAccess } from '@/hooks/useAdminAccess'

export default function AdminPreviewBanner() {
  const navigate = useNavigate()
  const { isPreview, preview, permissionLevel } = useAdminAccess()

  if (!isPreview || !preview) return null

  function exitPreview() {
    clearAdminPreview()
    navigate('/admin/developer')
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Eye className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-amber-100">
            Previewing admin panel as{' '}
            <span className="text-white">{preview.label}</span>
            <span className="font-normal text-amber-200/80">
              {' '}
              ({permissionLevel})
            </span>
          </p>
          <p className="mt-0.5 text-xs text-amber-200/75">
            Navigation and visible sections match this role. You are still signed in as a full
            admin — use Exit preview before making real changes.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={exitPreview}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
      >
        <X className="size-3.5" />
        Exit preview
      </button>
    </div>
  )
}
