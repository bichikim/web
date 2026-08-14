import {createRequire} from 'node:module'
import {mkdir, readdir, rename} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const assetsDirectory = path.resolve(process.cwd(), 'assets')
const sourceDirectory = path.join(assetsDirectory, 'focus-room-source')
const sourceConceptArtDirectory = path.join(sourceDirectory, 'concept-art')
const runtimeConceptArtDirectory = path.join(assetsDirectory, 'concept-art')
const sourceLayerDirectory = path.join(sourceDirectory, 'layers')
const runtimeLayerDirectory = path.join(assetsDirectory, 'focus-room-layers')
const scenePattern = /^focus-room-.+-concept\.png$/u
const sceneNames = (await readdir(sourceConceptArtDirectory)).filter((name) =>
  scenePattern.test(name),
)
const layerSceneNames = (await readdir(sourceLayerDirectory, {withFileTypes: true}))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const writeWebp = async (sourcePath, outputPath) => {
  await mkdir(path.dirname(outputPath), {recursive: true})

  const temporaryPath = `${outputPath}.tmp`

  await sharp(sourcePath).webp({effort: 6, quality: 95, smartSubsample: true}).toFile(temporaryPath)
  await rename(temporaryPath, outputPath)
}

await Promise.all(
  sceneNames.map(async (sceneName) => {
    await writeWebp(
      path.join(sourceConceptArtDirectory, sceneName),
      path.join(runtimeConceptArtDirectory, sceneName.replace(/\.png$/u, '.webp')),
    )
  }),
)

await Promise.all(
  layerSceneNames.map(async (sceneName) => {
    await writeWebp(
      path.join(sourceLayerDirectory, sceneName, 'base.png'),
      path.join(runtimeLayerDirectory, sceneName, 'base.webp'),
    )
  }),
)

console.log(
  `Compressed ${sceneNames.length} reference scenes and ${layerSceneNames.length} layer bases with WebP quality 95.`,
)
