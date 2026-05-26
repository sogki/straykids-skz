import { useSkzData } from '@/context/SkzDataContext'
import BannerEditor from '@/components/admin/BannerEditor'

export default function AdminBannerPage() {
  const { reload } = useSkzData()

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-6 text-sm text-muted-foreground">
        Edit the public announcement bar. Changes apply site-wide after visitors
        refresh.
      </p>
      <BannerEditor onSaved={() => reload()} />
    </div>
  )
}
