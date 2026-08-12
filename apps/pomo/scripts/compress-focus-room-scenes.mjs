import {createRequire} from 'node:module'
import {readdir, rename} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const conceptArtDirectory = path.resolve(process.cwd(), 'assets/concept-art')
const scenePattern = /^focus-room-.+-concept\.png$/u
const sceneNames = (await readdir(conceptArtDirectory)).filter((name) => scenePattern.test(name))

await Promise.all(
  sceneNames.map(async (sceneName) => {
    const sourcePath = path.join(conceptArtDirectory, sceneName)
    const outputPath = sourcePath.replace(/\.png$/u, '.webp')
    const temporaryPath = `${outputPath}.tmp`

    await sharp(sourcePath)
      .webp({effort: 6, nearLossless: true, quality: 95, smartSubsample: true})
      .toFile(temporaryPath)
    await rename(temporaryPath, outputPath)
  }),
)

console.log(`Compressed ${sceneNames.length} focus-room scenes with near-lossless WebP.`)
