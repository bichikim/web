import {createHash} from 'node:crypto'
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chunk} from 'es-toolkit/array'
import sharp from 'sharp'
import {measureRgbaError} from '../focus-room/measure-rgba-error.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const manifestPath = path.join(root, 'asset-library/tarot-source/illustrations/manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const CARD_COUNT = 78
const IMAGE_WIDTH = 1024
const IMAGE_HEIGHT = 1536
const MINIMUM_PSNR = 36
const MAXIMUM_MAE = 2.5
const MAXIMUM_CHANNEL_VALUE = 255
const DECIBEL_MULTIPLIER = 10
const WEBP_OPTIONS = {effort: 6, quality: 95, smartSubsample: true}
const COMPRESSION_CONCURRENCY = 4

if (manifest.maps.length !== CARD_COUNT) {
  throw new Error(`Expected ${CARD_COUNT} tarot illustrations, received ${manifest.maps.length}`)
}

const readPixels = (input) => sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject: true})
const checksum = (input) => createHash('sha256').update(input).digest('hex')

const validatePixels = async (source, output, name) => {
  const [original, converted] = await Promise.all([readPixels(source), readPixels(output)])
  if (
    original.info.width !== IMAGE_WIDTH ||
    original.info.height !== IMAGE_HEIGHT ||
    converted.info.width !== original.info.width ||
    converted.info.height !== original.info.height
  ) {
    throw new Error(`Unexpected illustration dimensions: ${name}`)
  }

  const error = measureRgbaError(original, converted)
  if (error === null || error.comparedValues === 0) {
    throw new Error(`Illustration alpha changed or contains no visible pixels: ${name}`)
  }

  const meanSquaredError = error.squaredError / error.comparedValues
  const psnr =
    meanSquaredError === 0
      ? Number.POSITIVE_INFINITY
      : DECIBEL_MULTIPLIER * Math.log10(MAXIMUM_CHANNEL_VALUE ** 2 / meanSquaredError)
  const mae = error.absoluteError / error.comparedValues
  if (psnr < MINIMUM_PSNR || mae > MAXIMUM_MAE) {
    throw new Error(`Illustration quality check failed: ${name} (PSNR ${psnr}, MAE ${mae})`)
  }

  return {mae, psnr}
}

const compressIllustration = async (entry) => {
  const source = await readFile(path.join(root, entry.originalIllustration))
  if (checksum(source) !== entry.originalSha256) {
    throw new Error(`Illustration original checksum changed: ${entry.id}`)
  }

  const output = await sharp(source).webp(WEBP_OPTIONS).toBuffer()
  const quality = await validatePixels(source, output, entry.id)
  if (output.length >= source.length) {
    throw new Error(`WebP is not smaller than its PNG original: ${entry.id}`)
  }

  const outputPath = path.join(root, entry.illustration)
  await mkdir(path.dirname(outputPath), {recursive: true})
  const temporaryPath = `${outputPath}.tmp`
  await writeFile(temporaryPath, output)
  await rename(temporaryPath, outputPath)

  return {outputBytes: output.length, sourceBytes: source.length, ...quality}
}

const results = await chunk(manifest.maps, COMPRESSION_CONCURRENCY).reduce(
  async (pending, entries) => {
    const previous = await pending
    const converted = await Promise.all(entries.map(compressIllustration))
    return [...previous, ...converted]
  },
  Promise.resolve([]),
)

console.log({
  cards: results.length,
  maximumMae: Math.max(...results.map((result) => result.mae)),
  minimumPsnr: Math.min(...results.map((result) => result.psnr)),
  originalBytes: results.reduce((total, result) => total + result.sourceBytes, 0),
  webpBytes: results.reduce((total, result) => total + result.outputBytes, 0),
})
