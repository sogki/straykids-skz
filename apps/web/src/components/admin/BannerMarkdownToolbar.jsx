const SNIPPETS = [
  { label: 'Bold', insert: '**text**', offset: 2 },
  { label: 'Italic', insert: '*text*', offset: 1 },
  { label: 'Code', insert: '`code`', offset: 1 },
  { label: 'Link', insert: '[label](/path)', offset: 1 },
]

export default function BannerMarkdownToolbar({ textareaId, onInsert }) {
  function applySnippet(snippet) {
    const el = document.getElementById(textareaId)
    if (!el) {
      onInsert?.(snippet.insert)
      return
    }
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const value = el.value
    const next =
      value.slice(0, start) + snippet.insert + value.slice(end)
    onInsert?.(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + snippet.offset
      el.setSelectionRange(pos, pos + 4)
    })
  }

  return (
    <div className="admin-md-toolbar">
      {SNIPPETS.map((s) => (
        <button
          key={s.label}
          type="button"
          className="admin-md-toolbar__btn"
          onClick={() => applySnippet(s)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
