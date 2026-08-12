/* eslint-disable no-magic-numbers -- AI_NOTE - Pixel coordinates are measured from the fixed 1672x941 focus-room scene masters. */
import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const IMAGE_WIDTH = 1672
const IMAGE_HEIGHT = 941
const ASSET_DIRECTORY = path.resolve(process.cwd(), 'assets/focus-room-animation')

const sourceDirectory = process.env.POMO_BLINK_SOURCE_DIRECTORY

if (!sourceDirectory) {
  throw new Error(
    'Set POMO_BLINK_SOURCE_DIRECTORY to the local directory that contains the AI blink masters.',
  )
}

const sources = [
  {
    closed: path.resolve(sourceDirectory, 'focused-closed.png'),
    half: path.resolve(sourceDirectory, 'focused-half.png'),
    name: 'day-focused',
    patch: {height: 105, left: 850, top: 250, width: 285},
  },
  {
    closed: path.resolve(sourceDirectory, 'user-closed.png'),
    half: path.resolve(sourceDirectory, 'user-half.png'),
    name: 'day-user',
    patch: {height: 118, left: 850, top: 242, width: 292},
  },
  {
    closed: path.resolve(sourceDirectory, 'night-focused-closed.png'),
    half: path.resolve(sourceDirectory, 'night-focused-half.png'),
    name: 'night-focused',
    patch: {height: 105, left: 850, top: 250, width: 292},
  },
  {
    closed: path.resolve(sourceDirectory, 'night-user-closed.png'),
    half: path.resolve(sourceDirectory, 'night-user-half.png'),
    name: 'night-user',
    patch: {height: 118, left: 842, top: 236, width: 300},
  },
]

const createFeatherMask = ({height, width}) =>
  Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="blur"><feGaussianBlur stdDeviation="5"/></filter></defs>
    <rect x="7" y="7" width="${width - 14}" height="${height - 14}" rx="25" fill="white" filter="url(#blur)"/>
  </svg>`)

async function createLayer({name, patch, source, state}) {
  const metadata = await sharp(source).metadata()

  if (metadata.width !== IMAGE_WIDTH || metadata.height !== IMAGE_HEIGHT) {
    throw new Error(`${name} source must be ${IMAGE_WIDTH}x${IMAGE_HEIGHT}.`)
  }

  const image = await sharp(source).extract(patch).png().toBuffer()
  const alpha = await sharp(createFeatherMask(patch)).extractChannel('alpha').toBuffer()

  await sharp(image)
    .joinChannel(alpha)
    .png()
    .toFile(path.join(ASSET_DIRECTORY, `eyes-${name}-${state}.png`))
}

await mkdir(ASSET_DIRECTORY, {recursive: true})
await Promise.all(
  sources.flatMap(({closed, half, name, patch}) => [
    createLayer({name, patch, source: half, state: 'half'}),
    createLayer({name, patch, source: closed, state: 'closed'}),
  ]),
)
