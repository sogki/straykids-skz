import { toPng } from 'html-to-image'

export const PROFILE_CARD_EXPORT_RADIUS_PX = 12

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * html-to-image often draws square layer bounds; mask the bitmap to true rounded corners.
 */
async function maskRoundedCorners(dataUrl, fillColor, radiusPx, pixelRatio) {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  const radius = radiusPx * pixelRatio

  roundRectPath(ctx, 0, 0, canvas.width, canvas.height, radius)
  ctx.fillStyle = fillColor
  ctx.fill()

  ctx.save()
  roundRectPath(ctx, 0, 0, canvas.width, canvas.height, radius)
  ctx.clip()
  ctx.drawImage(img, 0, 0)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

/**
 * Capture the profile card frame as PNG with stable layout (matches live preview).
 */
export async function captureProfileCardPng(frame, { backgroundColor }) {
  const width = frame.offsetWidth
  const height = frame.offsetHeight
  if (!width || !height) {
    throw new Error('Profile card is not visible')
  }

  const radius = PROFILE_CARD_EXPORT_RADIUS_PX
  const pixelRatio = 2
  const fill = backgroundColor ?? '#5865F2'

  frame.classList.add('profile-card__frame--exporting')
  await waitForPaint()

  try {
    const raw = await toPng(frame, {
      cacheBust: true,
      pixelRatio,
      width,
      height,
      backgroundColor: 'transparent',
      style: {
        borderRadius: `${radius}px`,
        overflow: 'hidden',
      },
    })

    return maskRoundedCorners(raw, fill, radius, pixelRatio)
  } finally {
    frame.classList.remove('profile-card__frame--exporting')
  }
}
