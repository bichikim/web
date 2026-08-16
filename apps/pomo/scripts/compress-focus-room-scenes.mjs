import {createRequire} from 'node:module'
import {mkdir, mkdtemp, readdir, rename, rm, stat} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const SCENE_QUALITY = 95
const ALPHA_ASSET_QUALITY = 95
const MAXIMUM_CONCURRENT_COMPRESSIONS = 4
const RGBA_CHANNEL_COUNT = 4
const RGB_CHANNEL_COUNT = 3
const ALPHA_CHANNEL_INDEX = 3
const MAXIMUM_CHANNEL_VALUE = 255
const MINIMUM_ALPHA_ASSET_PSNR = 34
const MAXIMUM_ALPHA_ASSET_MAE = 2.5
const DECIBEL_MULTIPLIER = 10
const assetsDirectory = path.resolve(process.cwd(), 'assets')
const temporaryDirectoryRoot = path.resolve(process.cwd(), '.temp')
await mkdir(temporaryDirectoryRoot, {recursive: true})
const temporaryDirectory = await mkdtemp(path.join(temporaryDirectoryRoot, 'pomo-webp-'))
let temporaryFileSequence = 0
const sourceDirectory = path.join(assetsDirectory, 'focus-room-source')
const sourceConceptArtDirectory = path.join(sourceDirectory, 'concept-art')
const sourceLayerDirectory = path.join(sourceDirectory, 'layers')
const sourceAnimationDirectory = path.join(sourceDirectory, 'animation')
const sourceDepthDirectory = path.join(sourceDirectory, 'depth')
const sourceStatusIconDirectory = path.join(sourceDirectory, 'status-icons')
const runtimeConceptArtDirectory = path.join(assetsDirectory, 'concept-art')
const runtimeLayerDirectory = path.join(assetsDirectory, 'focus-room-layers')
const runtimeAnimationDirectory = path.join(assetsDirectory, 'focus-room-animation')
const runtimeDepthDirectory = path.join(assetsDirectory, 'focus-room-depth')
const runtimeStatusIconDirectory = path.join(assetsDirectory, 'pomodoro-status-icons')
const scenePattern = /^focus-room-.+-concept\.png$/u
const runtimeLayerPattern = /^layer-(?!head\.png$).+\.png$/u
const runtimeAnimationPattern = /^(?:eyes-.+|steam-ai-.+)\.png$/u
const runtimeStatusIconPattern = /^(?:break|focus)-face\.png$/u
const pngPattern = /\.png$/u

const replacePngExtension = (name) => name.replace(pngPattern, '.webp')

const createTemporaryPath = (outputPath, variant = '') => {
  temporaryFileSequence += 1

  return path.join(
    temporaryDirectory,
    `${temporaryFileSequence}-${path.basename(outputPath)}${variant}.tmp`,
  )
}

const readRgba = (filePath) =>
  sharp(filePath).ensureAlpha().raw().toBuffer({resolveWithObject: true})

const assertMatchingDimensions = (source, output, outputPath) => {
  if (source.info.width !== output.info.width || source.info.height !== output.info.height) {
    throw new Error(`WebP dimensions do not match the PNG source: ${outputPath}`)
  }
}

const assertExactRenderedPixels = async (sourcePath, outputPath) => {
  const [source, output] = await Promise.all([readRgba(sourcePath), readRgba(outputPath)])

  assertMatchingDimensions(source, output, outputPath)

  for (let index = 0; index < source.data.length; index += RGBA_CHANNEL_COUNT) {
    const alpha = source.data[index + ALPHA_CHANNEL_INDEX]

    if (alpha !== output.data[index + ALPHA_CHANNEL_INDEX]) {
      throw new Error(`Lossless WebP alpha does not match the PNG source: ${outputPath}`)
    }

    if (alpha !== 0) {
      for (let channel = 0; channel < RGB_CHANNEL_COUNT; channel += 1) {
        if (source.data[index + channel] !== output.data[index + channel]) {
          throw new Error(`Lossless WebP color does not match the PNG source: ${outputPath}`)
        }
      }
    }
  }
}

const isAcceptableAlphaAsset = async (sourcePath, outputPath) => {
  const [source, output] = await Promise.all([readRgba(sourcePath), readRgba(outputPath)])

  assertMatchingDimensions(source, output, outputPath)

  let absoluteError = 0
  let squaredError = 0
  let comparedValues = 0

  for (let index = 0; index < source.data.length; index += RGBA_CHANNEL_COUNT) {
    const alpha = source.data[index + ALPHA_CHANNEL_INDEX]

    if (alpha !== output.data[index + ALPHA_CHANNEL_INDEX]) {
      return false
    }

    if (alpha !== 0) {
      const opacity = alpha / MAXIMUM_CHANNEL_VALUE

      for (let channel = 0; channel < RGB_CHANNEL_COUNT; channel += 1) {
        const difference = (source.data[index + channel] - output.data[index + channel]) * opacity
        absoluteError += Math.abs(difference)
        squaredError += difference ** 2
        comparedValues += 1
      }
    }
  }

  if (comparedValues === 0) {
    return true
  }

  const meanSquaredError = squaredError / comparedValues
  const psnr =
    meanSquaredError === 0
      ? Number.POSITIVE_INFINITY
      : DECIBEL_MULTIPLIER * Math.log10(MAXIMUM_CHANNEL_VALUE ** 2 / meanSquaredError)
  const mae = absoluteError / comparedValues

  return psnr >= MINIMUM_ALPHA_ASSET_PSNR && mae <= MAXIMUM_ALPHA_ASSET_MAE
}

const writeAtomicWebp = async ({options, outputPath, sourcePath, validate}) => {
  await mkdir(path.dirname(outputPath), {recursive: true})
  const temporaryPath = createTemporaryPath(outputPath)

  try {
    await sharp(sourcePath)
      .webp({effort: 6, ...options})
      .toFile(temporaryPath)
    await validate?.(sourcePath, temporaryPath)
    await rename(temporaryPath, outputPath)
  } finally {
    await rm(temporaryPath, {force: true})
  }
}

const writeSmallestAlphaWebp = async ({outputPath, sourcePath}) => {
  await mkdir(path.dirname(outputPath), {recursive: true})
  const lossyPath = createTemporaryPath(outputPath, '.lossy')
  const losslessPath = createTemporaryPath(outputPath, '.lossless')

  try {
    await Promise.all([
      sharp(sourcePath)
        .webp({
          alphaQuality: 100,
          effort: 6,
          quality: ALPHA_ASSET_QUALITY,
          smartSubsample: true,
        })
        .toFile(lossyPath),
      sharp(sourcePath).webp({effort: 6, lossless: true}).toFile(losslessPath),
    ])

    const [lossyFile, losslessFile] = await Promise.all([stat(lossyPath), stat(losslessPath)])
    const lossyIsSmaller = lossyFile.size <= losslessFile.size
    const useLossy = lossyIsSmaller && (await isAcceptableAlphaAsset(sourcePath, lossyPath))

    if (!useLossy) {
      await assertExactRenderedPixels(sourcePath, losslessPath)
    }

    await rename(useLossy ? lossyPath : losslessPath, outputPath)
  } finally {
    await Promise.all([rm(lossyPath, {force: true}), rm(losslessPath, {force: true})])
  }
}

const readMatchingNames = async (directory, pattern) =>
  (await readdir(directory)).filter((name) => pattern.test(name))

const runCompressionJobs = async (jobs) => {
  const pendingJobs = [...jobs]
  const runNextJob = async () => {
    const job = pendingJobs.shift()

    if (job === undefined) {
      return
    }

    await job()
    await runNextJob()
  }

  const results = await Promise.allSettled(
    Array.from({length: Math.min(MAXIMUM_CONCURRENT_COMPRESSIONS, pendingJobs.length)}, runNextJob),
  )
  const failure = results.find((result) => result.status === 'rejected')

  if (failure !== undefined) {
    throw failure.reason
  }
}

const removeStaleWebps = async ({directories, expectedPaths}) => {
  const stalePaths = (
    await Promise.all(
      directories.map(async (directory) => {
        const entries = await readdir(directory, {withFileTypes: true})

        return entries
          .filter((entry) => entry.isFile() && path.extname(entry.name) === '.webp')
          .map((entry) => path.join(directory, entry.name))
          .filter((filePath) => !expectedPaths.has(filePath))
      }),
    )
  ).flat()

  // Runtime WebPs are generated mirrors; pruning makes removed PNG sources fail at build instead of using stale output.
  await Promise.all(stalePaths.map((filePath) => rm(filePath)))

  return stalePaths.length
}

const removeStaleLayerDirectories = async (expectedDirectories) => {
  const staleDirectories = (await readdir(runtimeLayerDirectory, {withFileTypes: true}))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(runtimeLayerDirectory, entry.name))
    .filter((directory) => !expectedDirectories.has(directory))

  await Promise.all(
    staleDirectories.map((directory) => rm(directory, {force: true, recursive: true})),
  )

  return staleDirectories.length
}

const compressAssets = async () => {
  const sceneNames = await readMatchingNames(sourceConceptArtDirectory, scenePattern)
  const layerSceneNames = (await readdir(sourceLayerDirectory, {withFileTypes: true}))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  const animationNames = await readMatchingNames(sourceAnimationDirectory, runtimeAnimationPattern)
  const depthNames = await readMatchingNames(sourceDepthDirectory, pngPattern)
  const statusIconNames = await readMatchingNames(
    sourceStatusIconDirectory,
    runtimeStatusIconPattern,
  )

  const sceneJobs = sceneNames.map(
    (sceneName) => () =>
      writeAtomicWebp({
        options: {quality: SCENE_QUALITY, smartSubsample: true},
        outputPath: path.join(runtimeConceptArtDirectory, replacePngExtension(sceneName)),
        sourcePath: path.join(sourceConceptArtDirectory, sceneName),
      }),
  )
  const layerJobsByScene = await Promise.all(
    layerSceneNames.map(async (sceneName) => {
      const sourceSceneDirectory = path.join(sourceLayerDirectory, sceneName)
      const runtimeSceneDirectory = path.join(runtimeLayerDirectory, sceneName)
      const layerNames = await readMatchingNames(sourceSceneDirectory, runtimeLayerPattern)
      const baseJob = () =>
        writeAtomicWebp({
          options: {quality: SCENE_QUALITY, smartSubsample: true},
          outputPath: path.join(runtimeSceneDirectory, 'base.webp'),
          sourcePath: path.join(sourceSceneDirectory, 'base.png'),
        })
      const layerJobs = layerNames.map((layerName) => {
        const sourcePath = path.join(sourceSceneDirectory, layerName)
        const outputPath = path.join(runtimeSceneDirectory, replacePngExtension(layerName))

        return layerName.includes('mask')
          ? () =>
              writeAtomicWebp({
                options: {lossless: true},
                outputPath,
                sourcePath,
                validate: assertExactRenderedPixels,
              })
          : () => writeSmallestAlphaWebp({outputPath, sourcePath})
      })

      return {
        jobs: [baseJob, ...layerJobs],
        layerCount: layerJobs.length,
        outputPaths: [
          path.join(runtimeSceneDirectory, 'base.webp'),
          ...layerNames.map((layerName) =>
            path.join(runtimeSceneDirectory, replacePngExtension(layerName)),
          ),
        ],
        runtimeSceneDirectory,
      }
    }),
  )
  const animationJobs = animationNames.map(
    (animationName) => () =>
      writeSmallestAlphaWebp({
        outputPath: path.join(runtimeAnimationDirectory, replacePngExtension(animationName)),
        sourcePath: path.join(sourceAnimationDirectory, animationName),
      }),
  )
  const depthJobs = depthNames.map(
    (depthName) => () =>
      writeAtomicWebp({
        options: {lossless: true},
        outputPath: path.join(runtimeDepthDirectory, replacePngExtension(depthName)),
        sourcePath: path.join(sourceDepthDirectory, depthName),
        validate: assertExactRenderedPixels,
      }),
  )
  const statusIconJobs = statusIconNames.map(
    (statusIconName) => () =>
      writeSmallestAlphaWebp({
        outputPath: path.join(runtimeStatusIconDirectory, replacePngExtension(statusIconName)),
        sourcePath: path.join(sourceStatusIconDirectory, statusIconName),
      }),
  )
  const layerAssetCount = layerJobsByScene.reduce((total, scene) => total + scene.layerCount, 0)

  await runCompressionJobs([
    ...sceneJobs,
    ...layerJobsByScene.flatMap((scene) => scene.jobs),
    ...animationJobs,
    ...depthJobs,
    ...statusIconJobs,
  ])

  const expectedRuntimePaths = new Set([
    ...sceneNames.map((sceneName) =>
      path.join(runtimeConceptArtDirectory, replacePngExtension(sceneName)),
    ),
    ...layerJobsByScene.flatMap((scene) => scene.outputPaths),
    ...animationNames.map((animationName) =>
      path.join(runtimeAnimationDirectory, replacePngExtension(animationName)),
    ),
    ...depthNames.map((depthName) =>
      path.join(runtimeDepthDirectory, replacePngExtension(depthName)),
    ),
    ...statusIconNames.map((statusIconName) =>
      path.join(runtimeStatusIconDirectory, replacePngExtension(statusIconName)),
    ),
  ])
  const prunedAssetCount = await removeStaleWebps({
    directories: [
      runtimeConceptArtDirectory,
      ...layerJobsByScene.map((scene) => scene.runtimeSceneDirectory),
      runtimeAnimationDirectory,
      runtimeDepthDirectory,
      runtimeStatusIconDirectory,
    ],
    expectedPaths: expectedRuntimePaths,
  })
  const prunedDirectoryCount = await removeStaleLayerDirectories(
    new Set(layerJobsByScene.map((scene) => scene.runtimeSceneDirectory)),
  )

  console.log(
    [
      `Compressed ${sceneNames.length} scenes and ${layerSceneNames.length} layer bases`,
      `at WebP quality ${SCENE_QUALITY}. Compressed ${layerAssetCount} layers,`,
      `${animationNames.length} animations, ${depthNames.length} depth maps,`,
      `${statusIconNames.length} status icons, and pruned ${prunedAssetCount} stale assets`,
      `from ${prunedDirectoryCount} stale layer directories.`,
    ].join(' '),
  )
}

try {
  await compressAssets()
} finally {
  await rm(temporaryDirectory, {force: true, recursive: true})
}
