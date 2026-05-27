import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import SiteBannerView from '@/components/banner/SiteBannerView'
import BannerIconPicker from '@/components/admin/BannerIconPicker'
import BannerMarkdownToolbar from '@/components/admin/BannerMarkdownToolbar'
import { SITE_INTERNAL_LINKS } from '@/data/siteLinks'
import { sanitizeBannerIcon } from '@/data/bannerIcons'
import {
  fetchAdminBanner,
  getStoredAdminCode,
  updateAdminBanner,
} from '@/services/skzAdmin'
import '@/styles/SiteBanner.css'

const VARIANTS = [
  { value: 'promo', label: 'Promo (purple)' },
  { value: 'info', label: 'Info (blue)' },
  { value: 'alert', label: 'Alert (amber)' },
]

const DEFAULT_FORM = {
  enabled: false,
  message: '',
  link: '',
  linkLabel: '',
  variant: 'promo',
  icon: '',
  bgColor: '#5b21b6',
  textColor: '#f5f3ff',
  useCustomColors: false,
}

function mapBannerFromApi(data) {
  if (!data) return { ...DEFAULT_FORM }
  return {
    enabled: data.site_banner_enabled === 'true',
    message: data.site_banner_message ?? '',
    link: data.site_banner_link ?? '',
    linkLabel: data.site_banner_link_label ?? '',
    variant: data.site_banner_variant ?? 'promo',
    icon: sanitizeBannerIcon(data.site_banner_icon ?? ''),
    bgColor: data.site_banner_bg_color || '#5b21b6',
    textColor: data.site_banner_text_color || '#f5f3ff',
    useCustomColors: data.site_banner_use_custom_colors === 'true',
  }
}

export default function BannerEditor({ onSaved }) {
  const code = getStoredAdminCode()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)

  const patch = (updates) => setForm((f) => ({ ...f, ...updates }))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchAdminBanner(code)
        if (!cancelled) setForm(mapBannerFromApi(data))
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateAdminBanner(code, {
        ...form,
        icon: sanitizeBannerIcon(form.icon),
      })
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 size={20} className="animate-spin" />
        Loading banner settings…
      </div>
    )
  }

  return (
    <div className="admin-banner-layout">
      <form onSubmit={handleSubmit} className="admin-banner-form space-y-6">
        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Markdown: <code>**bold**</code>, <code>*italic*</code>,{' '}
              <code>`code`</code>, <code>[text](/path)</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => patch({ enabled: e.target.checked })}
              />
              Banner enabled
            </label>

            <div className="space-y-2">
              <Label htmlFor="banner-message">Message</Label>
              <BannerMarkdownToolbar
                textareaId="banner-message"
                onInsert={(next) => patch({ message: next })}
              />
              <textarea
                id="banner-message"
                className="admin-textarea"
                rows={4}
                value={form.message}
                onChange={(e) => patch({ message: e.target.value })}
                placeholder="**New puzzle!** Play today's [Daily Guess](/guess-song)"
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <BannerIconPicker
                value={form.icon}
                onChange={(icon) => patch({ icon })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Link</CardTitle>
            <CardDescription>
              Pick an internal page or paste a full URL. Add a button label to
              show a separate CTA chip instead of linking the whole bar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-link-internal">Internal page</Label>
              <select
                id="banner-link-internal"
                className="admin-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) patch({ link: e.target.value })
                }}
              >
                <option value="">Choose a page…</option>
                {SITE_INTERNAL_LINKS.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-link">Link URL or path</Label>
              <Input
                id="banner-link"
                value={form.link}
                onChange={(e) => patch({ link: e.target.value })}
                placeholder="/arcade or https://…"
                className="admin-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-link-label">CTA label (optional)</Label>
              <Input
                id="banner-link-label"
                value={form.linkLabel}
                onChange={(e) => patch({ linkLabel: e.target.value })}
                placeholder="Play now"
                className="admin-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Use a preset theme or your own background and text colours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.useCustomColors}
                onChange={(e) => patch({ useCustomColors: e.target.checked })}
              />
              Custom colours
            </label>

            {!form.useCustomColors ? (
              <div className="space-y-2">
                <Label htmlFor="banner-variant">Preset</Label>
                <select
                  id="banner-variant"
                  className="admin-select"
                  value={form.variant}
                  onChange={(e) => patch({ variant: e.target.value })}
                >
                  {VARIANTS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="admin-color-row">
                <div className="space-y-2">
                  <Label htmlFor="banner-bg">Background</Label>
                  <div className="admin-color-field">
                    <input
                      id="banner-bg"
                      type="color"
                      value={form.bgColor}
                      onChange={(e) => patch({ bgColor: e.target.value })}
                      className="admin-color-swatch"
                    />
                    <Input
                      value={form.bgColor}
                      onChange={(e) => patch({ bgColor: e.target.value })}
                      className="admin-input font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-fg">Text</Label>
                  <div className="admin-color-field">
                    <input
                      id="banner-fg"
                      type="color"
                      value={form.textColor}
                      onChange={(e) => patch({ textColor: e.target.value })}
                      className="admin-color-swatch"
                    />
                    <Input
                      value={form.textColor}
                      onChange={(e) => patch({ textColor: e.target.value })}
                      className="admin-input font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={saving} className="admin-save-btn">
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save banner
        </Button>
      </form>

      <Card className="admin-card admin-card--sticky">
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
          <CardDescription>
            Fixed at the top of the site, above the navigation bar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.enabled && form.message.trim() ? (
            <div className="site-banner-preview-chrome">
              <SiteBannerView {...form} preview />
              <div className="site-banner-preview-chrome__nav" aria-hidden="true">
                <span>SKZ Arcade</span>
                <span>Nav links</span>
              </div>
              <div
                className="h-14 bg-gradient-to-b from-zinc-800/70 to-transparent"
                aria-hidden="true"
              />
            </div>
          ) : (
            <p className="admin-preview-empty">
              Enable the banner and add a message to preview.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
