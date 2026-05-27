import { toPng } from 'html-to-image'

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

export async function captureDailyGuessShareCard(node) {
  if (!node) throw new Error('Share card is not mounted')

  const width = node.offsetWidth
  const height = node.offsetHeight
  if (!width || !height) {
    throw new Error('Share card is not visible')
  }

  await waitForPaint()

  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    width,
    height,
    backgroundColor: '#121213',
    skipFonts: true,
  })
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function copyDailyGuessShareImage(dataUrl) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return false
  }
  const blob = await dataUrlToBlob(dataUrl)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  return true
}

export function downloadDailyGuessShareImage(dataUrl, filename = 'skz-arcade-result.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export async function nativeShareDailyGuessImage(dataUrl, meta) {
  if (!navigator.share) return false

  const blob = await dataUrlToBlob(dataUrl)
  const file = new File([blob], 'skz-arcade-result.png', { type: 'image/png' })

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: meta.title,
        text: meta.shortText,
        url: meta.url,
        files: [file],
      })
    } else {
      await navigator.share({
        title: meta.title,
        text: `${meta.shortText}\n${meta.url}`,
        url: meta.url,
      })
    }
    return true
  } catch (err) {
    if (err?.name === 'AbortError') return false
    throw err
  }
}
