import { useSkzData } from '@/context/SkzDataContext'
import BannerEditor from '@/components/admin/BannerEditor'

export default function AdminBannerPage() {
  const { reload } = useSkzData()

  return (
    <div className="max-w-6xl">
      <header className="admin-page-header">
        <h1>Site banner</h1>
        <p>
          Customise the announcement strip at the top of the site. Visitors see
          changes after refresh.
        </p>
      </header>
      <BannerEditor onSaved={() => reload()} />
    </div>
  )
}
