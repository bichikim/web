import {createRequire} from 'node:module'
import {mkdir, rename, rm} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const DEPTH_PARALLAX_BLUR_SIGMA = 6

const readRgba = (filePath) =>
  sharp(filePath).ensureAlpha().raw().toBuffer({resolveWithObject: true})

const assertMatchingDepth = (expected, output, outputPath) => {
  const dimensionsMatch =
    expected.info.width === output.info.width && expected.info.height === output.info.height

  if (!dimensionsMatch || !expected.data.equals(output.data)) {
    throw new Error(`Runtime parallax depth does not match the smoothed source: ${outputPath}`)
  }
}

export const writeParallaxDepthWebp = async ({outputPath, sourcePath, temporaryPath}) => {
  await mkdir(path.dirname(outputPath), {recursive: true})

  try {
    const expected = await sharp(sourcePath)
      .blur(DEPTH_PARALLAX_BLUR_SIGMA)
      .ensureAlpha()
      .raw()
      .toBuffer({resolveWithObject: true})
    await sharp(sourcePath)
      .blur(DEPTH_PARALLAX_BLUR_SIGMA)
      .webp({effort: 6, lossless: true})
      .toFile(temporaryPath)
    const output = await readRgba(temporaryPath)
    assertMatchingDepth(expected, output, outputPath)
    await rename(temporaryPath, outputPath)
  } finally {
    await rm(temporaryPath, {force: true})
  }
}
