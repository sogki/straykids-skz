/**
 * Lightweight Discord-flavoured markdown → React nodes for embed previews.
 * Supports: **bold**, *italic*, __underline__, ~~strike~~, ||spoiler||,
 * `code`, ```blocks```, [links](url), > quotes, ***bold italic***
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseInline(text, keyPrefix = 'i') {
  const nodes = []
  let rest = text
  let ki = 0

  while (rest.length) {
    // Spoiler
    let m = rest.match(/^([\s\S]*?)\|\|([\s\S]+?)\|\|/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <span
          key={`${keyPrefix}-sp-${ki++}`}
          className="rounded bg-[#1e1f22] px-0.5 text-[#1e1f22] hover:text-[#dbdee1]"
        >
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </span>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Inline code
    m = rest.match(/^([\s\S]*?)`([^`\n]+)`/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <code
          key={`${keyPrefix}-c-${ki++}`}
          className="rounded bg-[#1e1f22] px-1 py-0.5 font-mono text-[0.9em]"
        >
          {m[2]}
        </code>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Bold italic
    m = rest.match(/^([\s\S]*?)\*\*\*([\s\S]+?)\*\*\*/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <strong key={`${keyPrefix}-bi-${ki++}`} className="font-bold italic">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </strong>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Bold
    m = rest.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <strong key={`${keyPrefix}-b-${ki++}`} className="font-semibold">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </strong>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Underline italic
    m = rest.match(/^([\s\S]*?)__\*([\s\S]+?)\*__/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <span key={`${keyPrefix}-ui-${ki++}`} className="underline italic">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </span>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Underline
    m = rest.match(/^([\s\S]*?)__([\s\S]+?)__/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <span key={`${keyPrefix}-u-${ki++}`} className="underline">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </span>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Italic (single *)
    m = rest.match(/^([\s\S]*?)\*([\s\S]+?)\*/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <em key={`${keyPrefix}-it-${ki++}`} className="italic">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </em>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Italic (single _)
    m = rest.match(/^([\s\S]*?)_([\s\S]+?)_/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <em key={`${keyPrefix}-it2-${ki++}`} className="italic">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </em>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Strikethrough
    m = rest.match(/^([\s\S]*?)~~([\s\S]+?)~~/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <span key={`${keyPrefix}-s-${ki++}`} className="line-through">
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </span>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    // Link
    m = rest.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)/)
    if (m) {
      if (m[1]) nodes.push(...parseInline(m[1], `${keyPrefix}-${ki++}`))
      nodes.push(
        <a
          key={`${keyPrefix}-a-${ki++}`}
          href={m[3]}
          className="text-[#00a8fc] hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {parseInline(m[2], `${keyPrefix}-${ki++}`)}
        </a>,
      )
      rest = rest.slice(m[0].length)
      continue
    }

    nodes.push(rest)
    break
  }

  return nodes
}

function parseBlocks(text) {
  const lines = String(text).split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const fence = line.slice(3)
      const buf = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i])
        i += 1
      }
      blocks.push(
        <pre
          key={`cb-${blocks.length}`}
          className="my-1 overflow-x-auto rounded bg-[#1e1f22] p-2 font-mono text-xs text-[#dbdee1]"
        >
          <code>{buf.join('\n')}</code>
        </pre>,
      )
      i += 1
      continue
    }

    // Block quote
    if (line.startsWith('>')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push(
        <div
          key={`q-${blocks.length}`}
          className="my-1 border-l-2 border-[#4e5058] pl-2 text-[#dbdee1]"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="text-sm">
              {parseInline(ql, `q-${blocks.length}-${qi}`)}
            </p>
          ))}
        </div>,
      )
      continue
    }

    if (line.trim() === '') {
      i += 1
      continue
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm text-[#dbdee1]">
        {parseInline(line, `p-${blocks.length}`)}
      </p>,
    )
    i += 1
  }

  return blocks
}

export default function DiscordMarkdown({ text, className = '', as: Tag = 'div' }) {
  if (!text) return null
  return <Tag className={className}>{parseBlocks(text)}</Tag>
}

export { parseInline, parseBlocks }
