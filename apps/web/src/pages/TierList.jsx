import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { HexColorPicker } from 'react-colorful'
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Download,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Link as LinkIcon,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  STRAY_KIDS_PHOTOS,
  STRAY_KIDS_PHOTO_COUNT,
  STRAY_KIDS_PHOTOS_PER_PAGE,
} from '@/data/strayKidsPhotos'
import {
  buildAlbumItems,
  buildGalleryItems,
  buildMixedItems,
  buildSkzooItems,
} from '@/data/tierListSources'
import { trackGameComplete, trackGameStart } from '@/services/skzAnalytics'
import styles from '@/styles/TierList.module.css'

const ACCENT = '#f59e0b'
const DRAG_MIME = 'application/x-skz-tier-item'

const ROW_COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#0ea5e9',
  '#14b8a6',
  '#a855f7',
]

const DEFAULT_LABELS = ['S', 'A', 'B', 'C', 'D', 'E', 'F']
const CUSTOM_ITEMS_KEY = 'skz_tier_list_custom_items'

function uid(prefix = 'item') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`
}

function makeRows(count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    id: `row_${i}`,
    label: DEFAULT_LABELS[i] || `Tier ${i + 1}`,
    color: ROW_COLOR_PALETTE[i % ROW_COLOR_PALETTE.length],
    itemIds: [],
  }))
}

function saveDownload(dataUrl, fileName) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName
  a.click()
}

function normalizeHex(input) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const [, r, g, b] = hex
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase()
  }
  return null
}

function ColorSwatchPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState(value)
  const wrapRef = useRef(null)

  useEffect(() => {
    setHexDraft(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function commit(next) {
    onChange(next)
    setHexDraft(next)
  }

  return (
    <div ref={wrapRef} className={styles.colorPickerWrap}>
      <button
        type="button"
        className={styles.colorTrigger}
        style={{ background: value }}
        aria-label={label || 'Pick a color'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div className={styles.colorPopover} role="dialog" aria-label={label || 'Color picker'}>
          <HexColorPicker
            color={value}
            onChange={commit}
            className={styles.colorPickerCanvas}
          />
          <div className={styles.colorSwatches}>
            {ROW_COLOR_PALETTE.map((swatch) => {
              const active = swatch.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={swatch}
                  type="button"
                  className={`${styles.colorSwatch} ${
                    active ? styles.colorSwatchActive : ''
                  }`}
                  style={{ background: swatch }}
                  onClick={() => commit(swatch)}
                  aria-label={swatch}
                />
              )
            })}
          </div>
          <div className={styles.colorHexRow}>
            <span className={styles.colorHexLabel}>HEX</span>
            <input
              className={styles.colorHexInput}
              value={hexDraft}
              onChange={(e) => {
                const next = e.target.value
                setHexDraft(next)
                const normalized = normalizeHex(next)
                if (normalized) onChange(normalized)
              }}
              onBlur={() => {
                const normalized = normalizeHex(hexDraft)
                if (normalized) commit(normalized)
                else setHexDraft(value)
              }}
              spellCheck={false}
              maxLength={9}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AccordionPanel({ id, title, icon: Icon, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`${styles.accordion} ${open ? styles.accordionOpen : ''}`}>
      <button
        type="button"
        className={styles.accordionHead}
        aria-expanded={open}
        aria-controls={`accordion-${id}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.accordionHeadLeft}>
          {Icon && <Icon size={15} aria-hidden="true" />}
          <span>{title}</span>
        </span>
        <span className={styles.accordionHeadRight}>
          {badge != null && <span className={styles.accordionBadge}>{badge}</span>}
          <ChevronDown
            size={15}
            className={styles.accordionChevron}
            aria-hidden="true"
          />
        </span>
      </button>
      {open && (
        <div id={`accordion-${id}`} className={styles.accordionBody}>
          {children}
        </div>
      )}
    </section>
  )
}

export default function TierList() {
  const [rowCount, setRowCount] = useState(4)
  const [rows, setRows] = useState(() => makeRows(4))
  const [itemsById, setItemsById] = useState(() =>
    Object.fromEntries(buildSkzooItems().map((i) => [i.id, i]))
  )
  const [poolIds, setPoolIds] = useState(() => buildSkzooItems().map((i) => i.id))
  const [customItems, setCustomItems] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [galleryPage, setGalleryPage] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const startedRef = useRef(false)
  const exportRef = useRef(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_ITEMS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const restored = parsed.filter((item) => item && item.id && item.image)
      if (!restored.length) return
      setCustomItems(restored)
      setItemsById((prev) => ({
        ...prev,
        ...Object.fromEntries(restored.map((i) => [i.id, i])),
      }))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems))
    } catch {
      /* ignore */
    }
  }, [customItems])

  function trackStart() {
    if (!startedRef.current) {
      startedRef.current = true
      trackGameStart('tier-list')
    }
  }

  function loadPool(items) {
    trackStart()
    setItemsById(() => Object.fromEntries(items.map((i) => [i.id, i])))
    setPoolIds(items.map((i) => i.id))
    setRows((prev) => prev.map((r) => ({ ...r, itemIds: [] })))
  }

  function normalizeRowsCount(nextCount) {
    setRows((prev) => {
      const next = makeRows(nextCount).map((base, idx) => {
        const old = prev[idx]
        return old
          ? { ...base, label: old.label, color: old.color, itemIds: old.itemIds }
          : base
      })
      const removed = prev.slice(nextCount).flatMap((r) => r.itemIds)
      if (removed.length) {
        setPoolIds((pool) => [
          ...removed,
          ...pool.filter((id) => !removed.includes(id)),
        ])
      }
      return next
    })
  }

  /**
   * Ensure an item exists in itemsById then place it in a row (or back in the pool).
   * Used by both internal moves and drops coming from sidebar source thumbs.
   */
  function placeItem(item, targetRowId = null) {
    trackStart()
    setItemsById((prev) =>
      prev[item.id] ? prev : { ...prev, [item.id]: item }
    )
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        itemIds: r.itemIds.filter((id) => id !== item.id),
      }))
    )
    if (targetRowId) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === targetRowId && !r.itemIds.includes(item.id)
            ? { ...r, itemIds: [...r.itemIds, item.id] }
            : r
        )
      )
      setPoolIds((prev) => prev.filter((id) => id !== item.id))
    } else {
      setPoolIds((prev) =>
        prev.includes(item.id) ? prev : [item.id, ...prev]
      )
    }
  }

  function moveItem(itemId, targetRowId = null) {
    const item = itemsById[itemId]
    if (!item) return
    placeItem(item, targetRowId)
  }

  const galleryPageCount = Math.max(
    1,
    Math.ceil(STRAY_KIDS_PHOTOS.length / STRAY_KIDS_PHOTOS_PER_PAGE)
  )
  const safeGalleryPage = Math.min(galleryPage, galleryPageCount)
  const gallerySliceStart = (safeGalleryPage - 1) * STRAY_KIDS_PHOTOS_PER_PAGE
  const gallerySlice = STRAY_KIDS_PHOTOS.slice(
    gallerySliceStart,
    gallerySliceStart + STRAY_KIDS_PHOTOS_PER_PAGE
  )

  const templates = useMemo(
    () => [
      {
        id: 'skzoo',
        label: 'SKZOO crew',
        emoji: '🦊',
        description: '8 SKZOO characters',
        apply: () => {
          setRowCount(4)
          setRows(makeRows(4))
          loadPool(buildSkzooItems())
        },
      },
      {
        id: 'albums',
        label: 'Albums',
        emoji: '💿',
        description: 'Every studio era',
        apply: () => {
          setRowCount(5)
          setRows(makeRows(5))
          loadPool(buildAlbumItems())
        },
      },
      {
        id: 'gallery',
        label: 'Gallery picks',
        emoji: '📸',
        description: '32 JYP photos',
        apply: () => {
          setRowCount(5)
          setRows(makeRows(5))
          loadPool(buildGalleryItems(32))
        },
      },
      {
        id: 'mixed',
        label: 'Mixed board',
        emoji: '✨',
        description: 'SKZOO + albums',
        apply: () => {
          setRowCount(6)
          setRows(makeRows(6))
          loadPool(buildMixedItems())
        },
      },
    ],
    []
  )

  async function handleUploadFiles(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    trackStart()
    const uploads = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id: uid('custom'),
                name: file.name.replace(/\.(png|jpe?g|webp|gif)$/i, ''),
                image: String(reader.result || ''),
                source: 'custom',
              })
            reader.readAsDataURL(file)
          })
      )
    )
    setCustomItems((prev) => [...uploads, ...prev])
    setItemsById((prev) => ({
      ...prev,
      ...Object.fromEntries(uploads.map((i) => [i.id, i])),
    }))
    setPoolIds((prev) => [...uploads.map((i) => i.id), ...prev])
    event.target.value = ''
  }

  function addUrlImage() {
    const url = imageUrl.trim()
    if (!url) return
    trackStart()
    const item = {
      id: uid('url'),
      name: 'Custom image',
      image: url,
      source: 'custom',
    }
    setCustomItems((prev) => [item, ...prev])
    setItemsById((prev) => ({ ...prev, [item.id]: item }))
    setPoolIds((prev) => [item.id, ...prev])
    setImageUrl('')
  }

  function clearCustomItems() {
    if (!customItems.length) return
    const ids = new Set(customItems.map((i) => i.id))
    setCustomItems([])
    setItemsById((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
    setPoolIds((prev) => prev.filter((id) => !ids.has(id)))
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        itemIds: r.itemIds.filter((id) => !ids.has(id)),
      }))
    )
  }

  async function downloadTierList() {
    if (!exportRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: {
          borderRadius: 'var(--radius, 0.75rem)',
          overflow: 'hidden',
        },
      })
      saveDownload(dataUrl, `skz-tier-list-${Date.now()}.png`)
      trackGameComplete('tier-list', {
        action: 'download',
        items: Object.keys(itemsById).length,
        tiers: rows.length,
      })
    } finally {
      setDownloading(false)
    }
  }

  function resetBoard() {
    setRows((prev) => prev.map((r) => ({ ...r, itemIds: [] })))
    setPoolIds(Object.keys(itemsById))
  }

  function randomizePoolOrder() {
    setPoolIds((prev) => [...prev].sort(() => Math.random() - 0.5))
  }

  // ─────────── Drag & drop ────────────

  function dragStartItem(e, item) {
    e.stopPropagation()
    // Use a custom MIME so native image drags from the browser can't fake a drop.
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item))
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function getDroppedItem(e) {
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.id && parsed.image) return parsed
    } catch {
      /* ignore */
    }
    return null
  }

  function onDropToRow(e, rowId) {
    e.preventDefault()
    const item = getDroppedItem(e)
    if (!item) return
    placeItem(item, rowId)
  }

  function onDropToPool(e) {
    e.preventDefault()
    const item = getDroppedItem(e)
    if (!item) return
    placeItem(item, null)
  }

  const skzooItems = useMemo(() => buildSkzooItems(), [])
  const albumItems = useMemo(() => buildAlbumItems(), [])
  const inPoolIds = useMemo(() => new Set(poolIds), [poolIds])

  return (
    <div className={styles.shell} style={{ '--game-accent': ACCENT }}>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Tier list customization">
          <Link to="/arcade" className={styles.sidebarBack}>
            <ArrowLeft size={14} strokeWidth={2.25} aria-hidden="true" />
            Back to Arcade
          </Link>
          <header className={styles.sidebarHead}>
            <span className={styles.sidebarKicker}>Customize</span>
            <h2 className={styles.sidebarTitle}>Tier controls</h2>
          </header>

          <AccordionPanel
            id="templates"
            title="Templates"
            icon={LayoutTemplate}
            badge={templates.length}
            defaultOpen
          >
            <div className={styles.templateGrid}>
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.templateCard}
                  onClick={t.apply}
                  title={t.description}
                >
                  <span className={styles.templateEmoji} aria-hidden="true">
                    {t.emoji}
                  </span>
                  <span className={styles.templateText}>
                    <span className={styles.templateName}>{t.label}</span>
                    <span className={styles.templateMeta}>{t.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </AccordionPanel>

          <AccordionPanel
            id="tiers"
            title="Tiers"
            icon={Layers}
            badge={rows.length}
            defaultOpen
          >
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="tier-row-count">
                Row count
              </label>
              <select
                id="tier-row-count"
                className={styles.select}
                value={rowCount}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setRowCount(n)
                  normalizeRowsCount(n)
                }}
              >
                {Array.from({ length: 7 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n} rows
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.rowList}>
              {rows.map((row, i) => (
                <div key={row.id} className={styles.rowEditor}>
                  <ColorSwatchPicker
                    value={row.color}
                    label={`Row ${i + 1} color`}
                    onChange={(color) =>
                      setRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, color } : r))
                      )
                    }
                  />
                  <input
                    className={styles.input}
                    value={row.label}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, label: e.target.value } : r
                        )
                      )
                    }
                    placeholder={`Tier ${i + 1}`}
                    maxLength={10}
                  />
                </div>
              ))}
            </div>
          </AccordionPanel>

          <AccordionPanel
            id="skzoo"
            title="SKZOO characters"
            icon={Sparkles}
            badge={skzooItems.length}
          >
            <div className={styles.skzooGrid}>
              {skzooItems.map((item) => {
                const inPool = inPoolIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    className={`${styles.thumb} ${
                      inPool ? styles.thumbActive : ''
                    }`}
                    onDragStart={(e) => dragStartItem(e, item)}
                    onClick={() => placeItem(item, null)}
                    title={`${item.name} — click or drag to add`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      draggable={false}
                    />
                    {inPool && (
                      <span className={styles.thumbBadge} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => loadPool(skzooItems)}
            >
              Load all SKZOO
            </button>
          </AccordionPanel>

          <AccordionPanel
            id="albums"
            title="Albums"
            icon={Disc3}
            badge={albumItems.length}
          >
            <div className={styles.albumGrid}>
              {albumItems.map((item) => {
                const inPool = inPoolIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    className={`${styles.thumb} ${
                      inPool ? styles.thumbActive : ''
                    }`}
                    onDragStart={(e) => dragStartItem(e, item)}
                    onClick={() => placeItem(item, null)}
                    title={`${item.name} — click or drag to add`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      draggable={false}
                    />
                    {inPool && (
                      <span className={styles.thumbBadge} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => loadPool(albumItems)}
            >
              Load all albums
            </button>
          </AccordionPanel>

          <AccordionPanel
            id="gallery"
            title="Gallery photos"
            icon={ImageIcon}
            badge={STRAY_KIDS_PHOTO_COUNT}
          >
            <div className={styles.galleryGrid}>
              {gallerySlice.map((photo) => {
                const id = `gallery_${photo.id}`
                const item = {
                  id,
                  name: photo.name,
                  image: photo.image,
                  source: 'gallery',
                }
                const inPool = inPoolIds.has(id)
                return (
                  <button
                    key={photo.id}
                    type="button"
                    draggable
                    className={`${styles.thumb} ${
                      inPool ? styles.thumbActive : ''
                    }`}
                    onDragStart={(e) => dragStartItem(e, item)}
                    onClick={() => placeItem(item, null)}
                    title={`${photo.name} — click or drag to add`}
                  >
                    <img
                      src={photo.image}
                      alt={photo.name}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    {inPool && (
                      <span className={styles.thumbBadge} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.pagerBtn}
                onClick={() => setGalleryPage((p) => Math.max(1, p - 1))}
                disabled={safeGalleryPage <= 1}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span>
                Page {safeGalleryPage}/{galleryPageCount}
              </span>
              <button
                type="button"
                className={styles.pagerBtn}
                onClick={() =>
                  setGalleryPage((p) => Math.min(galleryPageCount, p + 1))
                }
                disabled={safeGalleryPage >= galleryPageCount}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </AccordionPanel>

          <AccordionPanel
            id="upload"
            title="Upload images"
            icon={Upload}
            badge={customItems.length || null}
          >
            <label className={styles.dropZone}>
              <Upload size={20} aria-hidden="true" />
              <span className={styles.dropTitle}>Upload images</span>
              <span className={styles.dropMeta}>
                Stays in your browser. Never uploaded.
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleUploadFiles}
              />
            </label>
            {customItems.length > 0 && (
              <>
                <div className={styles.customGrid}>
                  {customItems.map((item) => (
                    <div key={item.id} className={styles.customCard}>
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        draggable={false}
                      />
                      <button
                        type="button"
                        className={styles.customRemove}
                        onClick={() => {
                          setCustomItems((prev) =>
                            prev.filter((i) => i.id !== item.id)
                          )
                          setItemsById((prev) => {
                            const next = { ...prev }
                            delete next[item.id]
                            return next
                          })
                          setPoolIds((prev) =>
                            prev.filter((id) => id !== item.id)
                          )
                          setRows((prev) =>
                            prev.map((r) => ({
                              ...r,
                              itemIds: r.itemIds.filter(
                                (id) => id !== item.id
                              ),
                            }))
                          )
                        }}
                        aria-label="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={clearCustomItems}
                >
                  <Trash2 size={14} /> Clear uploads
                </button>
              </>
            )}
          </AccordionPanel>

          <AccordionPanel id="url" title="Image URL" icon={LinkIcon}>
            <div className={styles.urlRow}>
              <input
                className={styles.input}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
              <button
                type="button"
                className={styles.iconBtn}
                onClick={addUrlImage}
                aria-label="Add image"
              >
                <Plus size={16} />
              </button>
            </div>
          </AccordionPanel>
        </aside>

        <section className={styles.main}>
          <header className={styles.mainHead}>
            <div className={styles.mainHeadTop}>
              <div className={styles.mainTitleBlock}>
                <span className={styles.mainEmoji} aria-hidden="true">
                  📚
                </span>
                <div>
                  <p className={styles.mainKicker}>Now playing</p>
                  <h1 className={styles.mainTitle}>SKZ Tier List Lab</h1>
                </div>
              </div>
              <div className={styles.mainActions}>
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  onClick={randomizePoolOrder}
                >
                  <Shuffle size={14} /> Shuffle
                </button>
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  onClick={resetBoard}
                >
                  <RotateCcw size={14} /> Clear board
                </button>
                <button
                  type="button"
                  className={`${styles.toolbarBtn} ${styles.toolbarBtnPrimary}`}
                  onClick={downloadTierList}
                  disabled={downloading}
                >
                  <Download size={14} />{' '}
                  {downloading ? 'Exporting…' : 'Download PNG'}
                </button>
              </div>
            </div>
            <p className={styles.mainSubtitle}>
              Build custom tier lists with SKZOO, gallery images, and your own
              uploads. Drag &amp; drop items between rows and the pool below.
            </p>
          </header>

          <div ref={exportRef} className={styles.exportWrap}>
            <div className={styles.tierBoard}>
              {rows.map((row) => (
                <div key={row.id} className={styles.tierRow}>
                  <div
                    className={styles.tierLabel}
                    style={{ background: row.color }}
                  >
                    {row.label || 'Tier'}
                  </div>
                  <div
                    className={styles.tierDropzone}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropToRow(e, row.id)}
                  >
                    {row.itemIds.length === 0 && (
                      <span className={styles.dropHint}>Drag items here</span>
                    )}
                    {row.itemIds.map((itemId) => {
                      const item = itemsById[itemId]
                      if (!item) return null
                      return (
                        <button
                          key={item.id}
                          className={styles.itemCard}
                          draggable
                          type="button"
                          onDragStart={(e) => dragStartItem(e, item)}
                          onClick={() => placeItem(item, null)}
                          title={`${item.name} — click to unrank`}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            draggable={false}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.poolWrap}>
            <header className={styles.poolHead}>
              <h3>Item pool</h3>
              <span className={styles.poolCount}>{poolIds.length}</span>
            </header>
            <div
              className={styles.pool}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropToPool}
            >
              {poolIds.length === 0 ? (
                <p className={styles.empty}>
                  Drop items here to unrank them, or load a template.
                </p>
              ) : (
                poolIds.map((itemId) => {
                  const item = itemsById[itemId]
                  if (!item) return null
                  return (
                    <button
                      key={item.id}
                      className={styles.itemCard}
                      draggable
                      type="button"
                      onDragStart={(e) => dragStartItem(e, item)}
                      title={item.name}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        draggable={false}
                      />
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
