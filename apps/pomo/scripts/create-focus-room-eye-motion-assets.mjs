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
    ],
    removalPaths: [
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
  },
]

const createIrisMask = (scene) => createPathMask(scene.irisPaths, 0.4)

const createRemovalMask = (scene) => createPathMask(scene.removalPaths, 0.55)

const createPathMask = (paths, feather) =>
  sharp(
    Buffer.from(`<svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${paths.map((irisPath) => `<path d="${irisPath}" fill="white"/>`).join('')}
    </svg>`),
  )
    .greyscale()
    .blur(feather)
    .png()
    .toBuffer()

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

  const removalMask = await createRemovalMask(scene)
  // AI_NOTE - A tight closed mask keeps the moving iris intact without
  // carrying surrounding skin or lashes; removal stays wider to hide remnants.
  const eyeLayerMask = await createIrisMask(scene)
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
      .png({compressionLevel: 9})
      .toFile(path.join(runtimeDirectory, 'layer-eye-irises.png')),
  ])

  if (candidateMetadata.width !== IMAGE_WIDTH || candidateMetadata.height !== IMAGE_HEIGHT) {
    console.warn(
      `${scene.id} candidate was normalized from ${candidateMetadata.width}x${candidateMetadata.height}.`,
    )
  }
}

await Promise.all(scenes.map(createSceneAssets))
