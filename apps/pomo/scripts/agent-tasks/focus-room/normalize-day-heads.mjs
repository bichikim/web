/* eslint-disable no-magic-numbers -- Pixel coordinates and color thresholds are measured from the fixed 1672x941 daytime master. */
// Aligns daytime focus-room head positions and writes reviewable normalized outputs.
import {createRequire} from 'node:module'
import {mkdir, rename} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const conceptArtDirectory = path.resolve(
  process.cwd(),
  'asset-library/focus-room-source/concept-art',
)
const outputDirectory = path.resolve(
  process.cwd(),
  '../../.temp/pomo-focus-room/mechanical-day-head-lock-v6',
)
const layerDirectory = path.join(outputDirectory, 'layers')
const imageWidth = 1672
const imageHeight = 941
const rgbChannels = 3
const focusedDonor = 'focus-room-day-writing-concept.png'
const gazeDonor = 'focus-room-day-writing-user-gaze-concept.png'
const jobs = [
  {
    donor: focusedDonor,
    target: 'focus-room-day-reading-concept.png',
  },
  {
    donor: gazeDonor,
    target: 'focus-room-day-reading-user-gaze-concept.png',
  },
  {
    donor: gazeDonor,
    target: 'focus-room-day-typing-user-gaze-concept.png',
  },
]

function isHairPixel(data, offset) {
  const red = data[offset]
  const green = data[offset + 1]
  const blue = data[offset + 2]
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722

  return luminance < 92 && red < 125 && green < 105 && blue < 95
}

function findHairBounds(data, y) {
  let left = imageWidth
  let right = -1

  for (let x = 790; x <= 1260; x += 1) {
    const offset = (y * imageWidth + x) * rgbChannels

    if (isHairPixel(data, offset)) {
      left = Math.min(left, x)
      right = Math.max(right, x)
    }
  }

  return right - left >= 70 ? {left, right} : undefined
}

function addNeckTransition(alpha) {
  const centerX = 1048

  for (let y = 390; y <= 480; y += 1) {
    const verticalFade = y <= 448 ? 1 : (480 - y) / (480 - 448)
    const halfWidth = 92 - Math.max(0, y - 420) * 0.45

    for (let x = Math.floor(centerX - halfWidth); x <= Math.ceil(centerX + halfWidth); x += 1) {
      const horizontalDistance = Math.abs(x - centerX) / halfWidth
      const horizontalFade = horizontalDistance <= 0.82 ? 1 : (1 - horizontalDistance) / (1 - 0.82)
      const opacity = Math.max(0, Math.min(1, verticalFade * horizontalFade))
      const index = y * imageWidth + x

      alpha[index] = Math.max(alpha[index], Math.round(255 * opacity))
    }
  }
}

async function createHeadMask(donorName, targetName) {
  const [donor, target] = await Promise.all(
    [donorName, targetName].map((name) =>
      sharp(path.join(conceptArtDirectory, name))
        .removeAlpha()
        .raw()
        .toBuffer({resolveWithObject: true}),
    ),
  )
  const alpha = Buffer.alloc(imageWidth * imageHeight)

  // Use the union of both silhouettes so the old head cannot remain
  // visible around the shared donor head. The fixed background fills that union.
  for (let y = 48; y <= 445; y += 1) {
    const donorBounds = findHairBounds(donor.data, y)
    const targetBounds = findHairBounds(target.data, y)

    if (donorBounds || targetBounds) {
      const left = Math.max(
        0,
        Math.min(donorBounds?.left ?? imageWidth, targetBounds?.left ?? imageWidth) - 7,
      )
      const right = Math.min(
        imageWidth - 1,
        Math.max(donorBounds?.right ?? -1, targetBounds?.right ?? -1) + 7,
      )

      for (let x = left; x <= right; x += 1) {
        alpha[y * imageWidth + x] = 255
      }
    }
  }

  addNeckTransition(alpha)

  return sharp(alpha, {raw: {channels: 1, height: imageHeight, width: imageWidth}})
    .blur(5)
    .png()
    .toBuffer()
}

async function normalizeHead({donor, target}) {
  const mask = await createHeadMask(donor, target)
  const donorLayer = await sharp(path.join(conceptArtDirectory, donor))
    .removeAlpha()
    .joinChannel(mask)
    .png()
    .toBuffer()
  const temporaryOutput = path.join(outputDirectory, `.${target}.temporary.png`)
  const finalOutput = path.join(outputDirectory, target)

  await Promise.all([
    sharp(mask).toFile(path.join(layerDirectory, target.replace('.png', '-mask.png'))),
    sharp(donorLayer).toFile(path.join(layerDirectory, target.replace('.png', '-head-layer.png'))),
  ])
  await sharp(path.join(conceptArtDirectory, target))
    .composite([{blend: 'over', input: donorLayer}])
    .removeAlpha()
    .png()
    .toFile(temporaryOutput)
  await rename(temporaryOutput, finalOutput)
}

await mkdir(layerDirectory, {recursive: true})
await Promise.all(jobs.map(normalizeHead))
