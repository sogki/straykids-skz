import AdminOverview from '@/pages/admin/AdminOverview'
import LeaderboardAdmin from '@/components/admin/LeaderboardAdmin'

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-10">
      <AdminOverview title="Analytics" />
      <LeaderboardAdmin />
    </div>
  )
}
