import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {writeParallaxDepthWebp} from '../focus-room/depth-parallax-assets.mjs'

const sourceDirectory = fileURLToPath(
  new URL('../../../asset-library/relax-player-source/depth/', import.meta.url),
)
const backgroundDirectory = fileURLToPath(new URL('../../../public/relax-player/', import.meta.url))
const outputDirectory = path.join(backgroundDirectory, 'depth')
const manifest = JSON.parse(await readFile(path.join(sourceDirectory, 'manifest.json'), 'utf8'))

await Promise.all(
  manifest.maps
    .filter((map) => map.publish !== false)
    .map(async (map) => {
      const background = await readFile(path.join(backgroundDirectory, map.source))
      const checksum = createHash('sha256').update(background).digest('hex')
      if (checksum !== map.sourceSha256) {
        throw new Error(`Depth map no longer matches its background: ${map.source}`)
      }

      const {name} = path.parse(map.source)
      const outputPath = path.join(outputDirectory, `${name}.webp`)
      await writeParallaxDepthWebp({
        outputPath,
        sourcePath: path.join(sourceDirectory, map.depth),
        temporaryPath: path.join(outputDirectory, `.${name}.webp`),
      })
    }),
)
