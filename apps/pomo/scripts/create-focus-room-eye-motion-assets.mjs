import {createRequire} from 'node:module'
import {mkdir, rename} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const IMAGE_WIDTH = 1672
const IMAGE_HEIGHT = 941
const RGBA_CHANNEL_COUNT = 4
const ALPHA_CHANNEL_INDEX = 3
const OPAQUE_ALPHA = 255
const REMOVAL_MASK_FEATHER = 0.55
const EYE_LAYER_MASK_FEATHER = 0.4
const MASK_DILATION_SIZE = 5
const ASSET_DIRECTORY = path.resolve(process.cwd(), 'assets')
const DAY_READING_EYE_FILL =
  'focus-room-source/layers/day-reading-focused/workfiles/eye-base-candidate-a.png'
const DAY_READING_EYE_BASE = 'focus-room-layers/day-reading-focused/layer-head-eye-base.png'
const DAY_USER_EYE_FILL =
  'focus-room-source/layers/day-reading-user/workfiles/eye-base-candidate-a.png'
const DAY_USER_EYE_LAYER = 'focus-room-layers/day-reading-user/layer-eye-irises.png'

const irisPaths = [
  [
    'M910 315 C917 314 925 319 931 327',
    'C936 334 936 340 933 343',
    'C929 347 921 346 915 342',
    'C909 338 906 331 906 324',
    'C906 320 908 317 910 315 Z',
  ].join(' '),
  [
    'M993 298 C1001 296 1008 301 1011 308',
    'C1014 315 1013 323 1009 328',
    'C1005 332 997 332 991 328',
    'C985 324 982 316 983 309',
    'C984 304 988 300 993 298 Z',
  ].join(' '),
]

const removalPaths = [
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
]

const scenes = [
  {
    fill: DAY_READING_EYE_FILL,
    head: 'focus-room-layers/day-reading-focused/layer-head.png',
    id: 'day-reading-focused',
    offsetX: 0,
  },
  {
    fill: DAY_READING_EYE_BASE,
    head: 'focus-room-layers/day-writing-focused/layer-head.png',
    id: 'day-writing-focused',
    offsetX: 0,
  },
  {
    fill: DAY_READING_EYE_BASE,
    head: 'focus-room-layers/day-typing-focused/layer-head.png',
    id: 'day-typing-focused',
    offsetX: -1,
  },
]

const userScenes = [
  {
    head: 'focus-room-layers/day-reading-user/layer-head.png',
    id: 'day-reading-user',
  },
  {
    head: 'focus-room-layers/day-writing-user/layer-head.png',
    id: 'day-writing-user',
  },
  {
    head: 'focus-room-layers/day-typing-user/layer-head.png',
    id: 'day-typing-user',
  },
]

const createPathMask = (paths, feather, offsetX) =>
  sharp(
    Buffer.from(`<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${offsetX} 0)">
        ${paths.map((pathData) => `<path d="${pathData}" fill="white"/>`).join('')}
      </g>
    </svg>`),
  )
    .greyscale()
    .blur(feather)
    .png()
    .toBuffer()

async function createAlphaMask(mask) {
  const {data, info} = await sharp(mask).greyscale().raw().toBuffer({resolveWithObject: true})
  const alphaMask = Buffer.alloc(info.width * info.height * RGBA_CHANNEL_COUNT, OPAQUE_ALPHA)

  for (let index = 0; index < data.length; index += 1) {
    alphaMask[index * RGBA_CHANNEL_COUNT + ALPHA_CHANNEL_INDEX] = data[index]
  }

  return sharp(alphaMask, {
    raw: {channels: RGBA_CHANNEL_COUNT, height: info.height, width: info.width},
  })
    .png()
    .toBuffer()
}

async function validateCanvasDimensions(source, label) {
  const metadata = await sharp(source).metadata()

  if (metadata.width !== IMAGE_WIDTH || metadata.height !== IMAGE_HEIGHT) {
    throw new Error(`${label} must be ${IMAGE_WIDTH}x${IMAGE_HEIGHT}: ${source}`)
  }
}

async function writePng(image, outputPath, options) {
  const temporaryPath = `${outputPath}.tmp`

  await image.png(options).toFile(temporaryPath)
  await rename(temporaryPath, outputPath)
}

async function shiftLeft(source, pixels) {
  const normalizedSource = await sharp(source)
    .resize({fit: 'fill', height: IMAGE_HEIGHT, width: IMAGE_WIDTH})
    .ensureAlpha()
    .png()
    .toBuffer()

  if (pixels === 0) {
    return normalizedSource
  }

  if (pixels >= 0) {
    throw new Error('Only the measured leftward eye alignment is supported.')
  }

  return sharp(normalizedSource)
    .extract({height: IMAGE_HEIGHT, left: -pixels, top: 0, width: IMAGE_WIDTH + pixels})
    .extend({
      background: '#00000000',
      bottom: 0,
      left: 0,
      right: -pixels,
      top: 0,
    })
    .ensureAlpha()
    .png()
    .toBuffer()
}

async function createSceneAssets(scene) {
  const fillSource = path.join(ASSET_DIRECTORY, scene.fill)
  const headSource = path.join(ASSET_DIRECTORY, scene.head)
  const sourceDirectory = path.join(ASSET_DIRECTORY, 'focus-room-source/layers', scene.id)
  const runtimeDirectory = path.join(ASSET_DIRECTORY, 'focus-room-layers', scene.id)

  await Promise.all([
    validateCanvasDimensions(headSource, `${scene.id} head`),
    mkdir(sourceDirectory, {recursive: true}),
    mkdir(runtimeDirectory, {recursive: true}),
  ])

  const [removalMask, eyeLayerMask, shiftedFill] = await Promise.all([
    createPathMask(removalPaths, REMOVAL_MASK_FEATHER, scene.offsetX),
    createPathMask(irisPaths, EYE_LAYER_MASK_FEATHER, scene.offsetX),
    shiftLeft(fillSource, scene.offsetX),
  ])
  const removalAlphaMask = await createAlphaMask(removalMask)
  const eyeFill = await sharp(shiftedFill)
    .composite([{blend: 'dest-in', input: removalAlphaMask}])
    .png()
    .toBuffer()

  await Promise.all([
    writePng(sharp(removalMask), path.join(sourceDirectory, 'mask-eye-removal.png')),
    writePng(sharp(eyeLayerMask), path.join(sourceDirectory, 'mask-eye-layer.png')),
    writePng(
      sharp(headSource)
        .ensureAlpha()
        .composite([{input: eyeFill}]),
      path.join(runtimeDirectory, 'layer-head-eye-base.png'),
      {compressionLevel: 9, palette: true, quality: 100},
    ),
  ])
}

async function createUserSceneAssets(scene) {
  const fillSource = path.join(ASSET_DIRECTORY, DAY_USER_EYE_FILL)
  const eyeSource = path.join(ASSET_DIRECTORY, DAY_USER_EYE_LAYER)
  const headSource = path.join(ASSET_DIRECTORY, scene.head)
  const sourceDirectory = path.join(ASSET_DIRECTORY, 'focus-room-source/layers', scene.id)
  const runtimeDirectory = path.join(ASSET_DIRECTORY, 'focus-room-layers', scene.id)

  await Promise.all([
    validateCanvasDimensions(eyeSource, 'day user eye layer'),
    validateCanvasDimensions(headSource, `${scene.id} head`),
    mkdir(sourceDirectory, {recursive: true}),
    mkdir(runtimeDirectory, {recursive: true}),
  ])

  const eyeLayerMask = await sharp(eyeSource).ensureAlpha().extractChannel('alpha').png().toBuffer()
  const removalMask = await sharp(eyeLayerMask)
    .convolve({
      height: MASK_DILATION_SIZE,
      kernel: Array.from({length: MASK_DILATION_SIZE ** 2}, () => 1),
      width: MASK_DILATION_SIZE,
    })
    .blur(REMOVAL_MASK_FEATHER)
    .png()
    .toBuffer()
  const removalAlphaMask = await createAlphaMask(removalMask)
  const eyeFill = await sharp(fillSource)
    .resize({fit: 'fill', height: IMAGE_HEIGHT, width: IMAGE_WIDTH})
    .ensureAlpha()
    .composite([{blend: 'dest-in', input: removalAlphaMask}])
    .png()
    .toBuffer()

  await Promise.all([
    writePng(sharp(removalMask), path.join(sourceDirectory, 'mask-eye-removal.png')),
    writePng(sharp(eyeLayerMask), path.join(sourceDirectory, 'mask-eye-layer.png')),
    writePng(
      sharp(headSource)
        .ensureAlpha()
        .composite([{input: eyeFill}]),
      path.join(runtimeDirectory, 'layer-head-eye-base.png'),
      {compressionLevel: 9, palette: true, quality: 100},
    ),
  ])
}

// The first scene creates the reusable daylight eye fill consumed by the other focused scenes.
await createSceneAssets(scenes[0])
await Promise.all([
  ...scenes.slice(1).map(createSceneAssets),
  ...userScenes.map(createUserSceneAssets),
])
