import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  'assets/focus-room-source/layers/night-reading-user/workfiles',
)
const OUTPUT_PATH = path.join(OUTPUT_DIRECTORY, 'jaw-displacement-weight-source-v1.png')

const jawWeightSvg = Buffer.from(`
  <svg width="1672" height="941" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="jaw-weight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" />
        <stop offset="20%" stop-color="black" />
        <stop offset="48%" stop-color="#555" />
        <stop offset="78%" stop-color="white" />
        <stop offset="100%" stop-color="#888" />
      </linearGradient>
      <filter id="soft-edge">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
    <rect width="1672" height="941" fill="black" />
    <path
      d="M 987 368 C 1006 364 1042 365 1059 372
        C 1056 385 1050 394 1041 399 C 1024 404 1003 400 991 389
        C 987 383 985 374 987 368 Z"
      fill="url(#jaw-weight)"
      filter="url(#soft-edge)"
    />
  </svg>
`)

await mkdir(OUTPUT_DIRECTORY, {recursive: true})
await sharp(jawWeightSvg).png().toFile(OUTPUT_PATH)

console.log(OUTPUT_PATH)
