import { useState } from 'react'
import { useSkzData } from '@/context/SkzDataContext'
import SiteBannerView from '@/components/banner/SiteBannerView'
import { normalizeBannerSettings } from '@/utils/bannerTheme'
import { parseBannerMarkdown } from '@/utils/bannerMarkdown'
import '@/styles/SiteBanner.css'

export default function SiteBanner() {
  const { settings } = useSkzData()
  const [dismissed, setDismissed] = useState(false)

  const banner = normalizeBannerSettings(settings)
  const { plain } = parseBannerMarkdown(banner.message)
  const visible = banner.enabled && Boolean(plain.trim()) && !dismissed

  if (!visible) return null

  return (
    <SiteBannerView
      {...banner}
      onDismiss={() => setDismissed(true)}
    />
  )
}
