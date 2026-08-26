import {createRequire} from 'node:module'
import {mkdir, readdir, rename, rm} from 'node:fs/promises'
import path from 'node:path'

const expectedSourceAssetCount = 24
const sourceOnlyAssetNames = new Set([
  'layer-mouth-open-wide-early.png',
  'layer-mouth-open-wide-late.png',
])
const rgbaChannelCount = 4
const alphaChannelIndex = 3
const sourceDirectory = path.resolve(import.meta.dirname, '../assets')
const [outputDirectoryArgument] = process.argv.slice(2)

if (outputDirectoryArgument === undefined) {
  throw new Error('Output directory is required.')
}

const outputDirectory = path.resolve(outputDirectoryArgument)
const require = createRequire(path.resolve(process.cwd(), 'apps/image-server/package.json'))
const sharp = require('sharp')
const allSourceNames = (await readdir(sourceDirectory))
  .filter((name) => /^layer-mouth-.+\.png$/u.test(name))
  .sort()

if (allSourceNames.length !== expectedSourceAssetCount) {
  throw new Error(
    `Expected ${expectedSourceAssetCount} source mouth assets, found ${allSourceNames.length}.`,
  )
}

const sourceNames = allSourceNames.filter((name) => !sourceOnlyAssetNames.has(name))
await mkdir(outputDirectory, {recursive: true})

const convertAsset = async (sourceName) => {
  const sourcePath = path.join(sourceDirectory, sourceName)
  const outputName = sourceName.replace(/\.png$/u, '.webp')
  const outputPath = path.join(outputDirectory, outputName)
  const temporaryPath = path.join(outputDirectory, `.${outputName}.${process.pid}.webp`)

  try {
    const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({resolveWithObject: true})
    await sharp(source.data, {
      raw: {
        channels: source.info.channels,
        height: source.info.height,
        width: source.info.width,
      },
    })
      .webp({effort: 6, lossless: true})
      .toFile(temporaryPath)

    const decoded = await sharp(temporaryPath)
      .ensureAlpha()
      .raw()
      .toBuffer({resolveWithObject: true})
    for (let index = 0; index < source.data.length; index += rgbaChannelCount) {
      const alpha = source.data[index + alphaChannelIndex]
      if (decoded.data[index + alphaChannelIndex] !== alpha) {
        throw new Error(`Decoded alpha does not match the PNG source: ${outputName}`)
      }
      if (
        alpha !== 0 &&
        (decoded.data[index] !== source.data[index] ||
          decoded.data[index + 1] !== source.data[index + 1] ||
          decoded.data[index + 2] !== source.data[index + 2])
      ) {
        throw new Error(`Decoded visible RGB does not match the PNG source: ${outputName}`)
      }
    }
    await rename(temporaryPath, outputPath)
  } finally {
    await rm(temporaryPath, {force: true})
  }
}

await Promise.all(sourceNames.map(convertAsset))
await Promise.all(
  [...sourceOnlyAssetNames].map((sourceName) =>
    rm(path.join(outputDirectory, sourceName.replace(/\.png$/u, '.webp')), {force: true}),
  ),
)
console.log(`Converted ${sourceNames.length} exact-alpha and exact-visible-RGB WebP assets.`)
