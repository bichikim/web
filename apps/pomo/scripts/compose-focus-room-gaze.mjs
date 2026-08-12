/* eslint-disable no-await-in-loop, no-continue, no-magic-numbers -- AI_NOTE - This one-off pixel compositing recipe intentionally keeps measured image coordinates literal and writes dependent assets in order. */
import {createRequire} from 'node:module'
import {mkdir, rm} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const conceptArtDirectory = path.resolve(process.cwd(), 'assets/concept-art')
const outputDirectory = process.env.POMO_GAZE_OUTPUT_DIRECTORY
  ? path.resolve(process.env.POMO_GAZE_OUTPUT_DIRECTORY)
  : conceptArtDirectory
const originalGazeDirectory = path.join(conceptArtDirectory, 'original-user-gaze')
const layerDirectory = path.join(outputDirectory, 'user-gaze-layers')
const featherRadius = Number(process.env.POMO_GAZE_FEATHER ?? 9)
const repairSourceDirectory = path.join(conceptArtDirectory, 'ai-boundary-repair-sources')

if (!Number.isFinite(featherRadius) || featherRadius < 0) {
  throw new Error('POMO_GAZE_FEATHER must be a non-negative number.')
}

const dayDonor = path.join(originalGazeDirectory, 'focus-room-day-writing-user-gaze-concept.png')
const nightDonor = path.join(
  originalGazeDirectory,
  'focus-room-night-writing-user-gaze-concept.png',
)
const repairSources = new Map([
  [dayDonor, path.join(repairSourceDirectory, 'focus-room-day-neck-hair-repair-source.png')],
  [nightDonor, path.join(repairSourceDirectory, 'focus-room-night-neck-hair-repair-source.png')],
])
const writingBases = new Map([
  [dayDonor, path.join(conceptArtDirectory, 'focus-room-day-writing-concept.png')],
  [nightDonor, path.join(conceptArtDirectory, 'focus-room-night-desk-concept.png')],
])

const jobs = [
  ['focus-room-day-reading-concept.png', dayDonor, 'focus-room-day-reading-user-gaze-concept.png'],
  ['focus-room-day-writing-concept.png', dayDonor, 'focus-room-day-writing-user-gaze-concept.png'],
  ['focus-room-day-typing-concept.png', dayDonor, 'focus-room-day-typing-user-gaze-concept.png'],
  [
    'focus-room-night-reading-concept.png',
    nightDonor,
    'focus-room-night-reading-user-gaze-concept.png',
  ],
  [
    'focus-room-night-desk-concept.png',
    nightDonor,
    'focus-room-night-writing-user-gaze-concept.png',
  ],
  [
    'focus-room-night-typing-concept.png',
    nightDonor,
    'focus-room-night-typing-user-gaze-concept.png',
  ],
]

const width = 1672
const height = 941

async function createHeadMask() {
  const {data} = await sharp(dayDonor).removeAlpha().raw().toBuffer({resolveWithObject: true})
  const alpha = Buffer.alloc(width * height)
  const contraction = Math.max(1, Math.round(featherRadius * 1.25))

  // AI_NOTE - Build the silhouette from the donor hair itself instead of a hand
  // drawn oval. Filling between each row's hair edges also includes the face,
  // while excluding every donor background pixel.
  for (let y = 66; y <= 423; y += 1) {
    let left = width
    let right = -1

    for (let x = 840; x <= 1215; x += 1) {
      const offset = (y * width + x) * 3
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      const isHair = luminance < 115 && red < 145 && green < 125 && blue < 115

      if (isHair) {
        left = Math.min(left, x)
        right = Math.max(right, x)
      }
    }

    if (right - left > 80 + contraction * 2 && y >= 66 + contraction && y <= 423 - contraction) {
      for (let x = left + contraction; x <= right - contraction; x += 1) {
        alpha[y * width + x] = 255
      }
    }
  }

  // Photoshop-style workflow: contract the matte before feathering it. The
  // feather can soften the seam but cannot carry donor scenery past the hair.
  return sharp(alpha, {raw: {channels: 1, height, width}})
    .blur(Math.max(0.3, featherRadius))
    .png()
    .toBuffer()
}

function smoothstep(low, high, value) {
  const normalized = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return normalized * normalized * (3 - 2 * normalized)
}

async function createNeckHairOverlay(donor, headOverlay) {
  const base = await sharp(writingBases.get(donor))
    .composite([{blend: 'over', input: headOverlay}])
    .removeAlpha()
    .raw()
    .toBuffer({resolveWithObject: true})
  const candidate = await sharp(repairSources.get(donor))
    .removeAlpha()
    .raw()
    .toBuffer({resolveWithObject: true})
  const alpha = Buffer.alloc(width * height)

  // AI_NOTE - The generated repair source is never used wholesale. Select only
  // newly darkened hair pixels around the user-specified neck coordinate, so
  // generated changes to skin, clothes, pose, and room are discarded.
  for (let y = 338; y <= 427; y += 1) {
    for (let x = 1055; x <= 1142; x += 1) {
      const horizontal = (x - 1094) / 46
      const vertical = (y - 382) / 51
      const radial = horizontal * horizontal + vertical * vertical
      if (radial > 1) {
        continue
      }

      const offset = (y * width + x) * 3
      const baseLuminance =
        base.data[offset] * 0.2126 + base.data[offset + 1] * 0.7152 + base.data[offset + 2] * 0.0722
      const candidateLuminance =
        candidate.data[offset] * 0.2126 +
        candidate.data[offset + 1] * 0.7152 +
        candidate.data[offset + 2] * 0.0722
      const hairConfidence = 1 - smoothstep(72, 145, candidateLuminance)
      const differenceConfidence = smoothstep(5, 42, baseLuminance - candidateLuminance)
      const spatialFeather = smoothstep(1, 0.76, radial)

      alpha[y * width + x] = Math.round(
        255 * hairConfidence * differenceConfidence * spatialFeather,
      )
    }
  }

  const repairMask = await sharp(alpha, {raw: {channels: 1, height, width}})
    .blur(1.2)
    .png()
    .toBuffer()
  const repairOverlay = await sharp(candidate.data, {
    raw: {channels: 3, height, width},
  })
    .joinChannel(repairMask)
    .png()
    .toBuffer()

  return {repairMask, repairOverlay}
}

await mkdir(layerDirectory, {recursive: true})
await mkdir(outputDirectory, {recursive: true})
const mask = await createHeadMask()
await sharp(mask).toFile(path.join(layerDirectory, 'head-mask.png'))

const overlays = new Map()
const repairOverlays = new Map()

for (const [label, donor] of [
  ['day', dayDonor],
  ['night', nightDonor],
]) {
  const overlay = await sharp(donor).removeAlpha().joinChannel(mask).png().toBuffer()

  overlays.set(donor, overlay)
  await sharp(overlay).toFile(path.join(layerDirectory, `focus-room-${label}-user-gaze-head.png`))

  const {repairMask, repairOverlay} = await createNeckHairOverlay(donor, overlay)
  repairOverlays.set(donor, repairOverlay)
  await sharp(repairMask).toFile(
    path.join(layerDirectory, `focus-room-${label}-neck-hair-mask.png`),
  )
  await sharp(repairOverlay).toFile(path.join(layerDirectory, `focus-room-${label}-neck-hair.png`))
}

for (const [baseName, donor, outputName] of jobs) {
  const temporaryOutput = path.join(outputDirectory, `.${outputName}.temporary`)

  await sharp(path.join(conceptArtDirectory, baseName))
    .composite([
      {blend: 'over', input: overlays.get(donor)},
      {blend: 'over', input: repairOverlays.get(donor)},
    ])
    .removeAlpha()
    .png()
    .toFile(temporaryOutput)

  await rm(path.join(outputDirectory, outputName), {force: true})
  await sharp(temporaryOutput).toFile(path.join(outputDirectory, outputName))
  await rm(temporaryOutput, {force: true})
}
