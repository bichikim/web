import {spawn} from 'node:child_process'
import {readdir} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'
import {writeParallaxDepthWebp} from '../focus-room/depth-parallax-assets.mjs'

const {values} = parseArgs({
  options: {
    'da3-source': {type: 'string'},
    python: {default: 'python3', type: 'string'},
  },
})
if (values['da3-source'] === undefined) {
  throw new Error('--da3-source must point to a Depth Anything 3 checkout')
}

const root = fileURLToPath(new URL('../../../', import.meta.url))
const cardsDirectory = path.join(root, 'src/features/tarot/assets/illustrations')
const sourceDirectory = path.join(root, 'asset-library/tarot-source/depth')
const runtimeDirectory = path.join(root, 'src/features/tarot/assets/depth')
const CARD_COUNT = 78
const sources = (await readdir(cardsDirectory)).filter((name) => name.endsWith('.png')).sort()
if (sources.length !== CARD_COUNT) {
  throw new Error(`Expected 78 tarot artwork files, received ${sources.length}`)
}
const generator = fileURLToPath(new URL('../focus-room/create-depth-maps.py', import.meta.url))
await new Promise((resolve, reject) => {
  const child = spawn(
    values.python,
    [
      '-u',
      generator,
      '--da3-source',
      values['da3-source'],
      '--output-dir',
      sourceDirectory,
      ...sources.flatMap((name) => ['--source', path.join(cardsDirectory, name)]),
    ],
    {stdio: 'inherit'},
  )
  child.once('error', reject)
  child.once('exit', (code) => {
    if (code === 0) {
      resolve()
    } else {
      reject(new Error(`Depth-map generator exited with ${code}`))
    }
  })
})

await Promise.all(
  sources.map((name) => {
    const stem = name.slice(0, -'.png'.length)
    const outputPath = path.join(runtimeDirectory, `depth-${stem}.webp`)
    return writeParallaxDepthWebp({
      outputPath,
      sourcePath: path.join(sourceDirectory, `depth-${stem}.png`),
      temporaryPath: `${outputPath}.tmp`,
    })
  }),
)
console.log(`Prepared ${sources.length} tarot depth maps for the enlarged card viewer.`)
