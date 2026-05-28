import BotAdmin from '@/components/admin/BotAdmin'
import { getStoredAdminAccess } from '@/services/skzAdmin'

export default function AdminBotPage() {
  const access = getStoredAdminAccess()
  if (access?.permission_level === 'moderator') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#121214] p-6 text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">Moderator panel</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Discord authentication is active and your role is recognized as moderator.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Website-wide admin features remain full-admin only, as requested. Moderator
          actions can be added here next (for example: queue-only bot actions, panel publish
          approvals, or deployment history).
        </p>
      </div>
    )
  }
  return <BotAdmin />
}
