import {createRequire} from 'node:module'
import {mkdir, mkdtemp, readdir, rename, rm, stat, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {writeParallaxDepthWebp} from './focus-room/depth-parallax-assets.mjs'

const commandArguments = process.argv.slice(2)
const unsupportedArguments = commandArguments.filter((argument) => argument !== '--depth-only')

if (unsupportedArguments.length > 0) {
  throw new Error(`Unsupported argument(s): ${unsupportedArguments.join(', ')}`)
}

const depthOnly = commandArguments.includes('--depth-only')
const require = createRequire(import.meta.url)
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
const assetLibraryDirectory = path.resolve(process.cwd(), 'asset-library')
const runtimeDirectory = path.resolve(process.cwd(), 'src/features/focus-room-animation/assets')
const temporaryDirectoryRoot = path.resolve(process.cwd(), '.temp')
await mkdir(temporaryDirectoryRoot, {recursive: true})
const temporaryDirectory = await mkdtemp(path.join(temporaryDirectoryRoot, 'pomo-webp-'))
let temporaryFileSequence = 0
const sourceDirectory = path.join(assetLibraryDirectory, 'focus-room-source')
const sourceConceptArtDirectory = path.join(sourceDirectory, 'concept-art')
const sourceLayerDirectory = path.join(sourceDirectory, 'layers')
const sourceBreathingMaskPath = path.join(sourceLayerDirectory, 'breathing-mask.png')
const sourceAnimationDirectory = path.join(sourceDirectory, 'animation')
const sourceDepthDirectory = path.join(sourceDirectory, 'depth')
const sourceStatusIconDirectory = path.join(sourceDirectory, 'status-icons')
const runtimeConceptArtDirectory = path.join(runtimeDirectory, 'concept-art')
const runtimeLayerDirectory = path.join(runtimeDirectory, 'layers')
const runtimeBreathingMaskPath = path.join(runtimeLayerDirectory, 'breathing-mask.webp')
const runtimeAnimationDirectory = path.join(runtimeDirectory, 'animation')
const runtimeDepthDirectory = path.join(runtimeDirectory, 'depth')
const runtimeStatusIconDirectory = path.resolve(
  process.cwd(),
  'src/components/assets/pomodoro-status-icons',
)
const scenePattern = /^focus-room-.+-concept\.png$/u
const runtimeLayerPattern = /^layer-(?!head\.png$).+\.png$/u
const runtimeAnimationPattern = /^(?:eyes-.+|steam-ai-.+)\.png$/u
const runtimeStatusIconPattern = /^(?:break|focus)-face\.png$/u
const sparseLayerPattern = /^layer-(?:building-lights-|faint-star-|star-)/u
const pngPattern = /\.png$/u
const layerLayoutName = 'layout.json'
const legacyLayerLayoutName = 'layer-layout.json'

const runtimeLayerNames = new Map([
  ['layer-background-faint-stars-removed-v2.png', 'background.webp'],
  ['layer-clouds-day-v1.png', 'clouds.webp'],
  ['layer-eye-irises.png', 'eyes.webp'],
  ['layer-hand-left.png', 'left-hand.webp'],
  ['layer-hand-right.png', 'right-hand.webp'],
  ['layer-head-eye-base.png', 'head.webp'],
  ['layer-head-hair-tips-mask-v4.png', 'hair-tips-mask.webp'],
  ['layer-mask-jaw-displacement.png', 'layer-mask-jaw-displacement.webp'],
  ['layer-resting-hand.png', 'resting-hand.webp'],
  ['layer-sky-mask-writing-focused-v1.png', 'sky-mask.webp'],
  ['layer-writing-hand.png', 'writing-hand.webp'],
])

const replacePngExtension = (name) => name.replace(pngPattern, '.webp')

const getIndexedRuntimePath = (name, pattern, directory) => {
  const match = pattern.exec(name)
  const index = match?.groups?.index

  return index === undefined ? null : path.join(directory, `${index.padStart(2, '0')}.webp`)
}

const getRuntimeLayerPath = (name) => {
  if (/^layer-mouth-.+\.png$/u.test(name)) {
    return replacePngExtension(name)
  }

  const indexedPath =
    getIndexedRuntimePath(
      name,
      /^layer-building-lights-window-minus-sky-(?<index>\d+)\.png$/u,
      'building-lights',
    ) ??
    getIndexedRuntimePath(name, /^layer-faint-star-(?<index>\d+)-v\d+\.png$/u, 'faint-stars') ??
    getIndexedRuntimePath(name, /^layer-star-(?<index>\d+)\.png$/u, 'stars')

  if (indexedPath !== null) {
    return indexedPath
  }

  const runtimeName = runtimeLayerNames.get(name)

  if (runtimeName === undefined) {
    throw new Error(`Runtime layer name requires an explicit mapping: ${name}`)
  }

  return runtimeName
}

const getRuntimeLayerId = (name) =>
  getRuntimeLayerPath(name)
    .replace(pngPattern, '')
    .replace(/\.webp$/u, '')
    .split(path.sep)
    .join('-')

const getRuntimeConceptArtName = (name) =>
  name
    .replace(/^focus-room-/u, '')
    .replace(/-concept\.png$/u, '.webp')
    .replace(/^night-desk\.webp$/u, 'night-writing.webp')

const getRuntimeDepthName = (name) =>
  replacePngExtension(name)
    .replace(/^depth-/u, '')
    .replace(/^night-desk\.webp$/u, 'night-writing.webp')

const getRuntimeAnimationPath = (name) => {
  const eyeMatch =
    /^eyes-(?<time>day|night)-(?<gaze>focused|user)-(?<state>closed|half)(?:-v\d+)?\.png$/u.exec(
      name,
    )
  const time = eyeMatch?.groups?.time
  const gaze = eyeMatch?.groups?.gaze
  const state = eyeMatch?.groups?.state

  if (time !== undefined && gaze !== undefined && state !== undefined) {
    return path.join('eyes', `${time}-${gaze}`, `${state}.webp`)
  }

  const steamMatch = /^steam-ai-(?<index>\d+)\.png$/u.exec(name)
  const steamIndex = steamMatch?.groups?.index

  if (steamIndex !== undefined) {
    return path.join('steam', `${steamIndex.padStart(2, '0')}.webp`)
  }

  throw new Error(`Runtime animation name requires an explicit mapping: ${name}`)
}

const getRuntimeStatusIconName = (name) => name.replace(/-face\.png$/u, '.webp')

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

  assertExactRenderedRgba(source, output, outputPath)
}

const assertExactRenderedRgba = (source, output, outputPath) => {
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

const writeTrimmedLosslessWebp = async ({outputPath, sourcePath}) => {
  await mkdir(path.dirname(outputPath), {recursive: true})
  const temporaryPath = createTemporaryPath(outputPath)

  try {
    const source = await sharp(sourcePath).trim().ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    })
    await sharp(source.data, {
      raw: {channels: source.info.channels, height: source.info.height, width: source.info.width},
    })
      .webp({effort: 6, lossless: true})
      .toFile(temporaryPath)
    const output = await readRgba(temporaryPath)
    assertExactRenderedRgba(source, output, outputPath)
    await rename(temporaryPath, outputPath)

    return {x: -source.info.trimOffsetLeft, y: -source.info.trimOffsetTop}
  } finally {
    await rm(temporaryPath, {force: true})
  }
}

const writeAtomicJson = async (outputPath, value) => {
  await mkdir(path.dirname(outputPath), {recursive: true})
  const temporaryPath = createTemporaryPath(outputPath)

  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
    await rename(temporaryPath, outputPath)
  } finally {
    await rm(temporaryPath, {force: true})
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

const readWebpPaths = async (directory) => {
  const entries = await readdir(directory, {withFileTypes: true})
  const nestedPaths = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return readWebpPaths(entryPath)
      }

      return path.extname(entry.name) === '.webp' ? [entryPath] : []
    }),
  )

  return nestedPaths.flat()
}

const removeStaleWebps = async ({directories, expectedPaths}) => {
  const stalePaths = (
    await Promise.all(directories.map((directory) => readWebpPaths(directory)))
  ).flat()
  const unexpectedPaths = stalePaths.filter((filePath) => !expectedPaths.has(filePath))

  // Runtime WebPs are generated mirrors; pruning makes removed PNG sources fail at build instead of using stale output.
  await Promise.all(unexpectedPaths.map((filePath) => rm(filePath)))

  return unexpectedPaths.length
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

const writeLayerLayouts = (scenes) =>
  Promise.all(
    scenes.map(async (scene) => {
      const layoutPath = path.join(scene.runtimeSceneDirectory, layerLayoutName)
      await rm(path.join(scene.runtimeSceneDirectory, legacyLayerLayoutName), {force: true})
      const entries = Object.entries(scene.layerLayout).sort(([left], [right]) =>
        left.localeCompare(right),
      )

      if (entries.length === 0) {
        await rm(layoutPath, {force: true})
        return
      }

      await writeAtomicJson(layoutPath, Object.fromEntries(entries))
    }),
  )

const createDepthCompressionPlan = async () => {
  const names = await readMatchingNames(sourceDepthDirectory, pngPattern)

  return {
    jobs: names.map(
      (name) => () =>
        writeParallaxDepthWebp({
          outputPath: path.join(runtimeDepthDirectory, getRuntimeDepthName(name)),
          sourcePath: path.join(sourceDepthDirectory, name),
          temporaryPath: createTemporaryPath(
            path.join(runtimeDepthDirectory, getRuntimeDepthName(name)),
          ),
        }),
    ),
    names,
    outputPaths: names.map((name) => path.join(runtimeDepthDirectory, getRuntimeDepthName(name))),
  }
}

const compressDepthAssets = async () => {
  const depthPlan = await createDepthCompressionPlan()

  await runCompressionJobs(depthPlan.jobs)
  const prunedAssetCount = await removeStaleWebps({
    directories: [runtimeDepthDirectory],
    expectedPaths: new Set(depthPlan.outputPaths),
  })

  console.log(
    `Prepared ${depthPlan.names.length} parallax depth maps and pruned ${prunedAssetCount} stale depth assets.`,
  )
}

const compressAssets = async () => {
  const sceneNames = await readMatchingNames(sourceConceptArtDirectory, scenePattern)
  const layerSceneNames = (await readdir(sourceLayerDirectory, {withFileTypes: true}))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  const animationNames = await readMatchingNames(sourceAnimationDirectory, runtimeAnimationPattern)
  const depthPlan = await createDepthCompressionPlan()
  const statusIconNames = await readMatchingNames(
    sourceStatusIconDirectory,
    runtimeStatusIconPattern,
  )
  const breathingMaskJob = () =>
    writeAtomicWebp({
      options: {lossless: true},
      outputPath: runtimeBreathingMaskPath,
      sourcePath: sourceBreathingMaskPath,
      validate: assertExactRenderedPixels,
    })

  const sceneJobs = sceneNames.map(
    (sceneName) => () =>
      writeAtomicWebp({
        options: {quality: SCENE_QUALITY, smartSubsample: true},
        outputPath: path.join(runtimeConceptArtDirectory, getRuntimeConceptArtName(sceneName)),
        sourcePath: path.join(sourceConceptArtDirectory, sceneName),
      }),
  )
  const layerJobsByScene = await Promise.all(
    layerSceneNames.map(async (sceneName) => {
      const sourceSceneDirectory = path.join(sourceLayerDirectory, sceneName)
      const runtimeSceneDirectory = path.join(runtimeLayerDirectory, sceneName)
      const sourceNames = await readdir(sourceSceneDirectory)
      const hasBase = sourceNames.includes('base.png')
      const layerNames = sourceNames.filter((name) => runtimeLayerPattern.test(name))
      const layerLayout = {}
      const baseJob = () =>
        writeAtomicWebp({
          options: {quality: SCENE_QUALITY, smartSubsample: true},
          outputPath: path.join(runtimeSceneDirectory, 'base.webp'),
          sourcePath: path.join(sourceSceneDirectory, 'base.png'),
        })
      const layerJobs = layerNames.map((layerName) => {
        const sourcePath = path.join(sourceSceneDirectory, layerName)
        const outputPath = path.join(runtimeSceneDirectory, getRuntimeLayerPath(layerName))

        if (sparseLayerPattern.test(layerName)) {
          return async () => {
            layerLayout[getRuntimeLayerId(layerName)] = await writeTrimmedLosslessWebp({
              outputPath,
              sourcePath,
            })
          }
        }

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
        hasBase,
        jobs: [...(hasBase ? [baseJob] : []), ...layerJobs],
        layerCount: layerJobs.length,
        layerLayout,
        outputPaths: [
          ...(hasBase ? [path.join(runtimeSceneDirectory, 'base.webp')] : []),
          ...layerNames.map((layerName) =>
            path.join(runtimeSceneDirectory, getRuntimeLayerPath(layerName)),
          ),
        ],
        runtimeSceneDirectory,
      }
    }),
  )
  const animationJobs = animationNames.map(
    (animationName) => () =>
      writeSmallestAlphaWebp({
        outputPath: path.join(runtimeAnimationDirectory, getRuntimeAnimationPath(animationName)),
        sourcePath: path.join(sourceAnimationDirectory, animationName),
      }),
  )
  const statusIconJobs = statusIconNames.map(
    (statusIconName) => () =>
      writeSmallestAlphaWebp({
        outputPath: path.join(runtimeStatusIconDirectory, getRuntimeStatusIconName(statusIconName)),
        sourcePath: path.join(sourceStatusIconDirectory, statusIconName),
      }),
  )
  const layerAssetCount = layerJobsByScene.reduce((total, scene) => total + scene.layerCount, 0)
  const layerBaseCount = layerJobsByScene.filter((scene) => scene.hasBase).length

  await runCompressionJobs([
    breathingMaskJob,
    ...sceneJobs,
    ...layerJobsByScene.flatMap((scene) => scene.jobs),
    ...animationJobs,
    ...depthPlan.jobs,
    ...statusIconJobs,
  ])

  await writeLayerLayouts(layerJobsByScene)

  const expectedRuntimePaths = new Set([
    runtimeBreathingMaskPath,
    ...sceneNames.map((sceneName) =>
      path.join(runtimeConceptArtDirectory, getRuntimeConceptArtName(sceneName)),
    ),
    ...layerJobsByScene.flatMap((scene) => scene.outputPaths),
    ...animationNames.map((animationName) =>
      path.join(runtimeAnimationDirectory, getRuntimeAnimationPath(animationName)),
    ),
    ...depthPlan.outputPaths,
    ...statusIconNames.map((statusIconName) =>
      path.join(runtimeStatusIconDirectory, getRuntimeStatusIconName(statusIconName)),
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
      `Compressed ${sceneNames.length} scenes and ${layerBaseCount} layer bases`,
      `at WebP quality ${SCENE_QUALITY}. Compressed ${layerAssetCount} layers,`,
      `${animationNames.length} animations, ${depthPlan.names.length} depth maps,`,
      `${statusIconNames.length} status icons, and pruned ${prunedAssetCount} stale assets`,
      `from ${prunedDirectoryCount} stale layer directories.`,
    ].join(' '),
  )
}

try {
  await (depthOnly ? compressDepthAssets() : compressAssets())
} finally {
  await rm(temporaryDirectory, {force: true, recursive: true})
}
