/* eslint-disable no-magic-numbers -- Bézier paths use measured scene coordinates. */
// AI_NOTE - Bézier paths and pixel coordinates are measured from fixed 1672x941 scene masters.
import {createRequire} from 'node:module'
import {mkdir, mkdtemp, rename, rm} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const IMAGE_WIDTH = 1672
const IMAGE_HEIGHT = 941
const ASSET_DIRECTORY = path.resolve(process.cwd(), 'assets/focus-room-animation')
const USER_ONLY = process.argv.includes('--user-only')
const FOCUSED_ONLY = process.argv.includes('--focused-only')
const DAY_FOCUSED_FEATURE_PATHS = [
  [
    'M18 63 C18 48 27 36 42 30 C53 25 64 24 75 27',
    'C85 24 94 27 100 35 C106 43 108 52 107 62',
    'C107 72 104 81 99 88 C94 96 86 101 76 103',
    'C63 104 50 100 39 93 C28 86 20 76 18 63 Z',
  ].join(' '),
  [
    'M110 31 C121 14 140 5 162 3 C185 2 206 11 218 27',
    'C225 36 229 47 234 54 C242 62 246 70 245 77',
    'C244 84 235 88 223 91 C208 94 192 93 177 90',
    'C160 88 145 84 133 79 C121 74 114 67 111 58',
    'C108 49 107 39 110 31 Z',
  ].join(' '),
]
const NIGHT_FOCUSED_FEATURE_PATHS = [...DAY_FOCUSED_FEATURE_PATHS]
const DAY_USER_FEATURE_PATHS = [
  [
    'M49 98 C46 82 49 68 58 57 C67 47 79 43 91 44',
    'C102 39 115 42 123 51 C132 60 138 74 142 89',
    'C146 101 144 124 138 133 C131 143 119 147 104 146',
    'C89 145 76 138 66 128 C57 119 52 109 49 98 Z',
  ].join(' '),
  [
    'M136 36 C146 13 167 2 191 1 C218 0 241 13 251 34',
    'C256 45 257 54 264 61 C274 70 279 81 278 90',
    'C277 98 268 104 256 108 C244 112 228 114 211 112',
    'C195 111 180 107 168 101 C156 95 149 88 144 80',
    'C139 71 135 62 134 53 C134 46 135 40 136 36 Z',
  ].join(' '),
]
const NIGHT_USER_FEATURE_PATHS = [
  [
    'M50 98 C47 82 50 68 59 57 C68 47 80 43 92 44',
    'C103 39 116 42 124 51 C133 60 139 74 143 89',
    'C147 101 145 124 139 133 C132 143 120 147 105 146',
    'C90 145 77 138 67 128 C58 119 53 109 50 98 Z',
  ].join(' '),
  [
    'M140 36 C150 13 171 2 195 1 C222 0 245 13 255 34',
    'C260 45 261 54 268 61 C278 70 283 81 282 90',
    'C281 98 272 104 260 108 C248 112 232 114 215 112',
    'C199 111 184 107 172 101 C160 95 153 88 148 80',
    'C143 71 139 62 138 53 C138 46 139 40 140 36 Z',
  ].join(' '),
]

const sourceDirectory = process.env.POMO_BLINK_SOURCE_DIRECTORY

if (!sourceDirectory) {
  throw new Error('Set POMO_BLINK_SOURCE_DIRECTORY to regenerate blink assets.')
}

if (USER_ONLY && FOCUSED_ONLY) {
  throw new Error('Use either --user-only or --focused-only, not both.')
}

const sources = [
  {
    closed: sourceDirectory && path.resolve(sourceDirectory, 'focused-closed.png'),
    featurePaths: DAY_FOCUSED_FEATURE_PATHS,
    half: sourceDirectory && path.resolve(sourceDirectory, 'focused-half.png'),
    name: 'day-focused',
    patch: {height: 105, left: 850, top: 250, width: 285},
  },
  {
    closed: sourceDirectory && path.resolve(sourceDirectory, 'user-closed.png'),
    featurePaths: DAY_USER_FEATURE_PATHS,
    half: sourceDirectory && path.resolve(sourceDirectory, 'user-half.png'),
    name: 'day-user',
    patch: {height: 148, left: 850, top: 212, width: 292},
  },
  {
    closed: sourceDirectory && path.resolve(sourceDirectory, 'night-focused-closed.png'),
    featurePaths: NIGHT_FOCUSED_FEATURE_PATHS,
    half: sourceDirectory && path.resolve(sourceDirectory, 'night-focused-half.png'),
    name: 'night-focused',
    patch: {height: 105, left: 850, top: 250, width: 292},
  },
  {
    closed: sourceDirectory && path.resolve(sourceDirectory, 'night-user-closed.png'),
    featurePaths: NIGHT_USER_FEATURE_PATHS,
    half: sourceDirectory && path.resolve(sourceDirectory, 'night-user-half.png'),
    name: 'night-user',
    patch: {height: 148, left: 842, top: 206, width: 300},
  },
]

const createFeatherMask = ({height, width}) =>
  Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="blur"><feGaussianBlur stdDeviation="5"/></filter></defs>
    <rect x="7" y="7" width="${width - 14}" height="${height - 14}" rx="25" fill="white" filter="url(#blur)"/>
  </svg>`)

const createFeatureMask = ({height, width}, paths) =>
  Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3"/>
      </filter>
    </defs>
    ${paths
      .map((featurePath) => `<path d="${featurePath}" fill="white" filter="url(#blur)"/>`)
      .join('')}
  </svg>`)

async function validateSource({name, source}) {
  const metadata = await sharp(source).metadata()

  if (metadata.width !== IMAGE_WIDTH || metadata.height !== IMAGE_HEIGHT) {
    throw new Error(`${name} source must be ${IMAGE_WIDTH}x${IMAGE_HEIGHT}.`)
  }
}

async function createLayer({destinationDirectory, featurePaths, name, patch, source, state}) {
  await validateSource({name, source})

  const image = await sharp(source).extract(patch).png().toBuffer()
  const mask = featurePaths ? createFeatureMask(patch, featurePaths) : createFeatherMask(patch)

  await sharp(image)
    .ensureAlpha()
    .composite([{blend: 'dest-in', input: mask}])
    .png()
    .toFile(path.join(destinationDirectory, `eyes-${name}-${state}.png`))
}

const activeSources = USER_ONLY
  ? sources.filter(({name}) => name.endsWith('-user'))
  : FOCUSED_ONLY
    ? sources.filter(({name}) => name.endsWith('-focused'))
    : sources

await mkdir(ASSET_DIRECTORY, {recursive: true})
const stagingDirectory = await mkdtemp(path.join(ASSET_DIRECTORY, '.staging-'))

try {
  const outputs = activeSources.flatMap(({closed, featurePaths, half, name, patch}) => [
    {featurePaths, name, patch, source: half, state: 'half'},
    {featurePaths, name, patch, source: closed, state: 'closed'},
  ])
  const generationResults = await Promise.allSettled(
    outputs.map((output) => createLayer({...output, destinationDirectory: stagingDirectory})),
  )
  const generationFailure = generationResults.find((result) => result.status === 'rejected')

  if (generationFailure) {
    throw generationFailure.reason
  }

  await Promise.all(
    outputs.map(({name, state}) => {
      const fileName = `eyes-${name}-${state}.png`
      return rename(path.join(stagingDirectory, fileName), path.join(ASSET_DIRECTORY, fileName))
    }),
  )
} finally {
  await rm(stagingDirectory, {force: true, recursive: true})
}
