import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const IMAGE_WIDTH = 1672
const IMAGE_HEIGHT = 941
const ASSET_DIRECTORY = path.resolve(process.cwd(), 'assets')

const scenes = [
  {
    candidate: 'focus-room-source/layers/day-reading-focused/workfiles/eye-base-candidate-a.png',
    head: 'focus-room-layers/day-reading-focused/layer-head.png',
    id: 'day-reading-focused',
    irisPaths: [
      [
        'M899 315 C905 308 916 308 926 314',
        'C936 320 940 334 936 343',
        'C932 352 921 354 910 349',
        'C900 344 895 334 895 325',
        'C895 321 897 317 899 315 Z',
      ].join(' '),
      [
        'M981 301 C990 296 1003 295 1014 301',
        'C1025 308 1030 322 1027 336',
        'C1024 350 1014 359 1002 360',
        'C989 359 979 350 974 339',
        'C970 326 972 310 981 301 Z',
      ].join(' '),
    ],
    highlights: [
      {center: {x: 904, y: 324}, radius: 3},
      {center: {x: 916, y: 320}, radius: 3},
      {center: {x: 989, y: 315}, radius: 3},
      {center: {x: 1003, y: 304}, radius: 4},
    ],
    irises: [
      {center: {x: 916, y: 330}, radius: {x: 21, y: 23}},
      {center: {x: 1002, y: 328}, radius: {x: 27, y: 32}},
    ],
    pupils: [
      {center: {x: 916, y: 329}, radius: {x: 10, y: 13}},
      {center: {x: 1001, y: 321}, radius: {x: 13, y: 17}},
    ],
  },
]

const createIrisMask = (scene) =>
  sharp(
    Buffer.from(`<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="feather"><feGaussianBlur stdDeviation="0.55"/></filter></defs>
      ${scene.irisPaths.map((irisPath) => `<path d="${irisPath}" fill="white" filter="url(#feather)"/>`).join('')}
    </svg>`),
  )
    .greyscale()
    .blur(0.55)
    .png()
    .toBuffer()

const isInsideEllipse = (point, ellipse) => {
  const x = (point.x - ellipse.center.x) / ellipse.radius.x
  const y = (point.y - ellipse.center.y) / ellipse.radius.y
  return x * x + y * y <= 1
}

const isInsideCircle = (point, circle) => {
  const x = point.x - circle.center.x
  const y = point.y - circle.center.y
  return x * x + y * y <= circle.radius * circle.radius
}

async function createEyeLayerMask(scene, headSource) {
  const {data, info} = await sharp(headSource)
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true})
  const mask = Buffer.alloc(IMAGE_WIDTH * IMAGE_HEIGHT)

  for (let y = 0; y < IMAGE_HEIGHT; y += 1) {
    for (let x = 0; x < IMAGE_WIDTH; x += 1) {
      if (!scene.irises.some((iris) => isInsideEllipse({x, y}, iris))) {
        continue
      }

      const index = y * IMAGE_WIDTH + x
      const pixelIndex = index * info.channels
      const red = data[pixelIndex]
      const green = data[pixelIndex + 1]
      const blue = data[pixelIndex + 2]
      const point = {x, y}
      const isBrownIris = red < 180 && red > green + 12 && green > blue + 4
      const isPupil = scene.pupils.some((pupil) => isInsideEllipse(point, pupil))
      const isHighlight = scene.highlights.some((highlight) => isInsideCircle(point, highlight))

      if (isBrownIris || isPupil || isHighlight) {
        mask[index] = 255
      }
    }
  }

  return sharp(mask, {raw: {channels: 1, height: IMAGE_HEIGHT, width: IMAGE_WIDTH}})
    .blur(0.55)
    .png()
    .toBuffer()
}

async function createAlphaMask(mask) {
  const {data, info} = await sharp(mask).greyscale().raw().toBuffer({resolveWithObject: true})
  const alphaMask = Buffer.alloc(info.width * info.height * 4, 255)

  for (let index = 0; index < data.length; index += 1) {
    alphaMask[index * 4 + 3] = data[index]
  }

  return sharp(alphaMask, {
    raw: {channels: 4, height: info.height, width: info.width},
  })
    .png()
    .toBuffer()
}

async function validateDimensions(source, label) {
  const metadata = await sharp(source).metadata()

  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error(`Cannot read ${label} dimensions: ${source}`)
  }

  return metadata
}

async function createSceneAssets(scene) {
  const candidateSource = path.join(ASSET_DIRECTORY, scene.candidate)
  const headSource = path.join(ASSET_DIRECTORY, scene.head)
  const sourceDirectory = path.join(ASSET_DIRECTORY, 'focus-room-source/layers', scene.id)
  const runtimeDirectory = path.join(ASSET_DIRECTORY, 'focus-room-layers', scene.id)
  const candidateMetadata = await validateDimensions(candidateSource, 'candidate')
  const headMetadata = await validateDimensions(headSource, 'head')

  if (headMetadata.width !== IMAGE_WIDTH || headMetadata.height !== IMAGE_HEIGHT) {
    throw new Error(`${scene.id} head must be ${IMAGE_WIDTH}x${IMAGE_HEIGHT}.`)
  }

  await Promise.all([
    mkdir(sourceDirectory, {recursive: true}),
    mkdir(runtimeDirectory, {recursive: true}),
  ])

  const removalMask = await createIrisMask(scene)
  const eyeLayerMask = await createEyeLayerMask(scene, headSource)
  const removalAlphaMask = await createAlphaMask(removalMask)
  const eyeLayerAlphaMask = await createAlphaMask(eyeLayerMask)
  const candidate = await sharp(candidateSource)
    .resize({fit: 'fill', height: IMAGE_HEIGHT, width: IMAGE_WIDTH})
    .ensureAlpha()
    .composite([{blend: 'dest-in', input: removalAlphaMask}])
    .png()
    .toBuffer()

  await Promise.all([
    sharp(removalMask).toFile(path.join(sourceDirectory, 'mask-eye-removal.png')),
    sharp(eyeLayerMask).toFile(path.join(sourceDirectory, 'mask-eye-layer.png')),
    sharp(headSource)
      .ensureAlpha()
      .composite([{input: candidate}])
      .png({compressionLevel: 9, palette: true, quality: 100})
      .toFile(path.join(runtimeDirectory, 'layer-head-eye-base.png')),
    sharp(headSource)
      .ensureAlpha()
      .composite([{blend: 'dest-in', input: eyeLayerAlphaMask}])
      .png({compressionLevel: 9, palette: true, quality: 100})
      .toFile(path.join(runtimeDirectory, 'layer-eye-irises.png')),
  ])

  if (candidateMetadata.width !== IMAGE_WIDTH || candidateMetadata.height !== IMAGE_HEIGHT) {
    console.warn(
      `${scene.id} candidate was normalized from ${candidateMetadata.width}x${candidateMetadata.height}.`,
    )
  }
}

await Promise.all(scenes.map(createSceneAssets))
