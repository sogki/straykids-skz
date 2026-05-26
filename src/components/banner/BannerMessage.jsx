import { parseBannerMarkdown } from '@/utils/bannerMarkdown'

export default function BannerMessage({ message, className }) {
  const { html } = parseBannerMarkdown(message)
  if (!html) return null

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
