import {cp, mkdir, open, stat, writeFile} from 'node:fs/promises'
import path from 'node:path'

const [, , source = 'apps/wallpaper-web/.output/public', target = '.vercel/output'] = process.argv
const required = [
  'index.html',
  'favicon.png',
  'models/white-cat/model.poffo',
  'models/white-cat/poster.webp',
  'models/profile/model.poffo',
  'models/profile/portrait/model.poffo',
  'models/profile/portrait/tall/model.poffo',
  'models/street/model.poffo',
  'models/street/portrait/model.poffo',
  'models/street/portrait/tall/model.poffo',
  'music/library.json',
  'wallpapers/window/loop.mp4',
]
await Promise.all(
  required.map(async (file) => {
    if (!(await stat(path.join(source, file))).isFile()) {
      throw new Error(`Missing static deployment asset: ${file}`)
    }
  }),
)
const model = await open(path.join(source, 'models/white-cat/model.poffo'))
try {
  const HEADER_BYTES = 64
  const signature = Buffer.from('POFFO\r\n\x1a')
  const header = Buffer.alloc(HEADER_BYTES)
  const {bytesRead} = await model.read(header, 0, header.length, 0)
  const ASSET_COUNT_OFFSET = 28
  if (
    bytesRead !== header.length ||
    !header.subarray(0, signature.length).equals(signature) ||
    header.readUInt32LE(ASSET_COUNT_OFFSET) === 0
  ) {
    throw new Error('Character must be a native Poffo file with embedded textures')
  }
} finally {
  await model.close()
}
await mkdir(path.dirname(target), {recursive: true})
// A fresh destination prevents old deployment files from being shipped with this build.
await mkdir(target)
await cp(source, path.join(target, 'static'), {recursive: true})
await writeFile(
  path.join(target, 'config.json'),
  `${JSON.stringify({routes: [{handle: 'filesystem'}], version: 3})}\n`,
)
console.log(`Prepared static deployment in ${target}`)
