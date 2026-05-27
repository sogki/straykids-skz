import { useLocation } from 'react-router-dom'
import { getRouteSeo } from '@/data/routeSeo'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

/** Applies SEO / Open Graph for the current public route. */
export default function RouteDocumentMeta() {
  const { pathname } = useLocation()
  const meta = getRouteSeo(pathname)

  useDocumentMeta({
    title: meta.title,
    description: meta.description,
    path: meta.path,
    image: meta.image,
    keywords: meta.keywords,
    noindex: meta.noindex,
  })

  return null
}
