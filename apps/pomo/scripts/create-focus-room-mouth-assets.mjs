import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(path.resolve(process.cwd(), '../image-server/package.json'))
const sharp = require('sharp')

const SOURCE_WIDTH = 1672
const SOURCE_HEIGHT = 941
const RGBA_CHANNEL_COUNT = 4
const RGB_CHANNEL_COUNT = 3
const ALPHA_CHANNEL_INDEX = 3
const OPAQUE_ALPHA_THRESHOLD = 250
const MASK_FEATHER_PIXELS = 4
const MOUTH_EDIT_FEATHER_PIXELS = 1.5
const MOUTH_REMOVAL_FEATHER_PIXELS = 2
const SKIN_SAMPLE_BOUNDS = {bottom: 132, left: 45, right: 145, top: 72}
const SKIN_SAMPLE_MOUTH_EXCLUSION = {bottom: 123, left: 50, right: 142, top: 82}
const NOSE_EXCLUSION = {centerX: 78, centerY: 57, radiusX: 27, radiusY: 17}
const NOSE_EXCLUSION_FEATHER_PIXELS = 3
const MOUTH_SKIN_PATH = [
  'M 46 75',
  'C 68 65 125 65 145 77',
  'C 148 90 143 105 134 112',
  'C 112 119 71 118 51 110',
  'C 44 101 42 84 46 75',
  'Z',
].join(' ')
const OPEN_MOUTH_SKIN_PATH = [
  'M 45 70',
  'C 68 60 126 61 146 75',
  'C 150 91 146 111 134 121',
  'C 112 130 68 127 48 116',
  'C 40 104 39 82 45 70',
  'Z',
].join(' ')
const MOUTH_REMOVAL_PATH = [
  'M 49 77',
  'C 68 68 125 68 143 80',
  'C 144 98 139 113 130 120',
  'C 112 126 73 124 56 116',
  'C 47 107 45 88 49 77',
  'Z',
].join(' ')
const DAY_MOUTH_REMOVAL_PATH = [
  'M 49 77',
  'C 72 68 119 54 145 66',
  'C 150 91 141 112 130 120',
  'C 112 126 73 124 56 116',
  'C 47 107 45 88 49 77',
  'Z',
].join(' ')
// oxlint-disable-next-line id-length -- Sharp's color object uses r/g/b channel keys.
const PREVIEW_BACKGROUND = {alpha: 0, b: 0, g: 0, r: 0}
const SOURCE_DIRECTORY = path.resolve(process.cwd(), 'asset-library/focus-room-source/layers')
const SCENE_CONFIGS = {
  'day-reading-user': {
    eyeBaseSource: 'head-eye-base-with-rest-smile-source-v2.png',
    maskOutput: 'mask-mouth-lower-face-v4.png',
    mouthlessPreview: 'preview-mouthless-base-v4.png',
    mouthlessSource: 'generated-head-mouthless-v4.png',
    mouthRemovalPath: DAY_MOUTH_REMOVAL_PATH,
    originalHeadSource: 'head-with-rest-smile-source-v2.png',
    patch: {height: 180, left: 930, top: 285, width: 260},
    previewOutput: 'preview-mouth-heads-v2.png',
    version: 'v2',
  },
  'night-reading-user': {
    eyeBaseSource: 'head-eye-base-with-rest-smile-source-v1.png',
    maskOutput: 'mask-mouth-lower-face-v1.png',
    mouthlessPreview: 'preview-mouthless-base-v1.png',
    mouthlessSource: 'generated-head-mouthless-v2.png',
    originalHeadSource: 'head-with-rest-smile-source-v1.png',
    patch: {height: 180, left: 930, top: 270, width: 260},
    previewOutput: 'preview-mouth-heads-v1.png',
    sharedMaskOffset: {x: -4, y: 17},
    sharedMaskSource: 'shared-alpha-reference-v1.png',
    version: 'v1',
  },
}
const sceneId = process.argv[2] ?? 'day-reading-user'
const sceneConfig = SCENE_CONFIGS[sceneId]

if (sceneConfig === undefined) {
  throw new Error(`Unsupported mouth asset scene: ${sceneId}`)
}

const {patch} = sceneConfig

const visemes = [
  {extendsBelowLip: false, name: 'rest', source: sceneConfig.originalHeadSource},
  {
    editPath: [
      'M 62 72',
      'C 76 67 116 68 130 75',
      'C 135 82 132 94 124 99',
      'C 108 105 78 104 63 98',
      'C 58 92 57 79 62 72',
      'Z',
    ].join(' '),
    extendsBelowLip: false,
    name: 'closed',
    source: `generated-head-closed-${sceneConfig.version}.png`,
  },
  {
    editPath: [
      'M 60 65',
      'C 75 57 126 59 141 69',
      'C 147 82 141 105 131 112',
      'C 112 120 73 116 57 106',
      'C 50 95 52 73 60 65',
      'Z',
    ].join(' '),
    extendsBelowLip: true,
    name: 'open',
    source: `generated-head-open-${sceneConfig.version}.png`,
  },
  {
    editPath: [
      'M 58 67',
      'C 74 59 129 60 143 70',
      'C 148 82 142 105 132 112',
      'C 111 119 72 115 56 105',
      'C 49 94 51 76 58 67',
      'Z',
    ].join(' '),
    extendsBelowLip: false,
    name: 'wide',
    source: `generated-head-wide-${sceneConfig.version}.png`,
  },
  {
    editPath: [
      'M 70 65',
      'C 82 57 111 58 123 66',
      'C 132 78 128 104 119 111',
      'C 105 117 80 113 70 104',
      'C 62 94 62 75 70 65',
      'Z',
    ].join(' '),
    extendsBelowLip: false,
    name: 'round',
    source: `generated-head-round-${sceneConfig.version}.png`,
  },
  {
    editPath: [
      'M 61 68',
      'C 75 61 121 62 135 70',
      'C 139 79 135 98 127 104',
      'C 111 110 76 106 61 100',
      'C 55 92 55 77 61 68',
      'Z',
    ].join(' '),
    extendsBelowLip: false,
    name: 'narrow',
    source: `generated-head-narrow-${sceneConfig.version}.png`,
  },
]

const createPathMask = (pathData, featherPixels) =>
  Buffer.from(`
    <svg width="${patch.width}" height="${patch.height}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="feather"><feGaussianBlur stdDeviation="${featherPixels}" /></filter></defs>
      <path
        d="${pathData}"
        fill="white"
        filter="url(#feather)"
      />
    </svg>
  `)

const createNoseExclusionMask = () =>
  Buffer.from(`
    <svg width="${patch.width}" height="${patch.height}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="feather"><feGaussianBlur stdDeviation="${NOSE_EXCLUSION_FEATHER_PIXELS}" /></filter></defs>
      <ellipse
        cx="${NOSE_EXCLUSION.centerX}"
        cy="${NOSE_EXCLUSION.centerY}"
        fill="white"
        filter="url(#feather)"
        rx="${NOSE_EXCLUSION.radiusX}"
        ry="${NOSE_EXCLUSION.radiusY}"
      />
    </svg>
  `)

const createSharedMouthMask = async (sourcePath, offset = {x: 0, y: 0}) => {
  const shiftedSource = await sharp(sourcePath)
    .extract({
      height: patch.height - Math.abs(offset.y),
      left: Math.max(0, -offset.x),
      top: Math.max(0, -offset.y),
      width: patch.width - Math.abs(offset.x),
    })
    .extend({
      background: '#00000000',
      bottom: Math.max(0, -offset.y),
      left: Math.max(0, offset.x),
      right: Math.max(0, -offset.x),
      top: Math.max(0, offset.y),
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      background: '#ffffffff',
      channels: RGBA_CHANNEL_COUNT,
      height: patch.height,
      width: patch.width,
    },
  })
    .composite([{blend: 'dest-in', input: shiftedSource}])
    .png()
    .toBuffer()
}

const assertSourceSize = async (sourcePath) => {
  const metadata = await sharp(sourcePath).metadata()

  if (metadata.width !== SOURCE_WIDTH || metadata.height !== SOURCE_HEIGHT) {
    throw new Error(`Unexpected generated head dimensions: ${sourcePath}`)
  }
}

const calculateSkinToneOffset = async (originalPatch, generatedPatch) => {
  const [{data: original}, {data: generated}] = await Promise.all([
    sharp(originalPatch).ensureAlpha().raw().toBuffer({resolveWithObject: true}),
    sharp(generatedPatch).ensureAlpha().raw().toBuffer({resolveWithObject: true}),
  ])
  const channelOffsets = [0, 0, 0]
  let sampleCount = 0

  for (let y = SKIN_SAMPLE_BOUNDS.top; y < SKIN_SAMPLE_BOUNDS.bottom; y += 1) {
    for (let x = SKIN_SAMPLE_BOUNDS.left; x < SKIN_SAMPLE_BOUNDS.right; x += 1) {
      const isMouth =
        x >= SKIN_SAMPLE_MOUTH_EXCLUSION.left &&
        x < SKIN_SAMPLE_MOUTH_EXCLUSION.right &&
        y >= SKIN_SAMPLE_MOUTH_EXCLUSION.top &&
        y < SKIN_SAMPLE_MOUTH_EXCLUSION.bottom
      const pixelOffset = (y * patch.width + x) * RGBA_CHANNEL_COUNT
      const isOpaqueSkin =
        !isMouth &&
        original[pixelOffset + ALPHA_CHANNEL_INDEX] >= OPAQUE_ALPHA_THRESHOLD &&
        generated[pixelOffset + ALPHA_CHANNEL_INDEX] >= OPAQUE_ALPHA_THRESHOLD

      if (isOpaqueSkin) {
        for (let channel = 0; channel < RGB_CHANNEL_COUNT; channel += 1) {
          channelOffsets[channel] +=
            original[pixelOffset + channel] - generated[pixelOffset + channel]
        }
        sampleCount += 1
      }
    }
  }

  if (sampleCount === 0) {
    throw new Error('Could not find opaque skin pixels for mouth color matching.')
  }

  return channelOffsets.map((offset) => offset / sampleCount)
}

const createColorMatchedPatch = async (sourcePath, originalPatch) => {
  await assertSourceSize(sourcePath)
  const generatedPatch = await sharp(sourcePath).extract(patch).ensureAlpha().png().toBuffer()
  const offsets = await calculateSkinToneOffset(originalPatch, generatedPatch)
  const matchedPatch = await sharp(generatedPatch)
    .linear([1, 1, 1, 1], [...offsets, 0])
    .png()
    .toBuffer()
  const residualOffsets = await calculateSkinToneOffset(originalPatch, matchedPatch)

  if (residualOffsets.some((offset) => Math.abs(offset) > 1)) {
    throw new Error(`Mouth skin color matching did not converge: ${sourcePath}`)
  }

  return matchedPatch
}

const createMouthAsset = async ({
  sceneDirectory,
  workfileDirectory,
  originalPatch,
  mouthlessBasePatch,
  outerMask,
  viseme,
}) => {
  const sourcePath = path.join(workfileDirectory, viseme.source)
  const outputPath = path.join(sceneDirectory, `layer-mouth-${viseme.name}.png`)

  const mouthPatch =
    viseme.editPath === undefined
      ? originalPatch
      : await sharp(sourcePath)
          .extract(patch)
          .ensureAlpha()
          .composite([
            {
              blend: 'dest-in',
              input: createPathMask(viseme.editPath, MOUTH_EDIT_FEATHER_PIXELS),
            },
          ])
          .png()
          .toBuffer()

  // Preserve generated lip pixels; the tight edit mask keeps repainted skin off the original-pixel base.
  await sharp(viseme.editPath === undefined ? originalPatch : mouthlessBasePatch)
    .composite([
      ...(viseme.editPath === undefined ? [] : [{input: mouthPatch}]),
      {blend: 'dest-in', input: outerMask},
    ])
    .png()
    .toFile(outputPath)

  return outputPath
}

const createMouthlessHeads = async (sceneDirectory, workfileDirectory, mouthlessPatch) => {
  const headTargets = [
    {output: 'layer-head.png', source: sceneConfig.originalHeadSource},
    {output: 'layer-head-eye-base.png', source: sceneConfig.eyeBaseSource},
  ]

  await Promise.all(
    headTargets.map(async (target) => {
      const sourcePath = path.join(workfileDirectory, target.source)
      await assertSourceSize(sourcePath)
      await sharp(sourcePath)
        .composite([{input: mouthlessPatch, left: patch.left, top: patch.top}])
        .png()
        .toFile(path.join(sceneDirectory, target.output))
    }),
  )
}

const createPreview = async (sceneDirectory, workfileDirectory, mouthPaths) => {
  const mouthlessHeadPath = path.join(sceneDirectory, 'layer-head.png')
  const mouthlessHead = await sharp(mouthlessHeadPath).extract(patch).png().toBuffer()
  const previews = await Promise.all(
    mouthPaths.map((mouthPath) =>
      sharp(mouthlessHead)
        .composite([{input: mouthPath}])
        .png()
        .toBuffer(),
    ),
  )

  await sharp({
    create: {
      background: PREVIEW_BACKGROUND,
      channels: 4,
      height: patch.height,
      width: patch.width * previews.length,
    },
  })
    .composite(previews.map((input, index) => ({input, left: patch.width * index, top: 0})))
    .png()
    .toFile(path.join(workfileDirectory, sceneConfig.previewOutput))

  await sharp(mouthlessHead)
    .png()
    .toFile(path.join(workfileDirectory, sceneConfig.mouthlessPreview))
}

const createAssets = async () => {
  const sceneDirectory = path.join(SOURCE_DIRECTORY, sceneId)
  const workfileDirectory = path.join(sceneDirectory, 'workfiles')
  await mkdir(workfileDirectory, {recursive: true})
  const headSilhouette = await sharp(path.join(workfileDirectory, sceneConfig.originalHeadSource))
    .extract(patch)
    .ensureAlpha()
    .tint('#ffffff')
    .png()
    .toBuffer()
  const originalPatch = await sharp(path.join(workfileDirectory, sceneConfig.originalHeadSource))
    .extract(patch)
    .ensureAlpha()
    .png()
    .toBuffer()
  const createMouthMask = (pathData) =>
    sharp(createPathMask(pathData, MASK_FEATHER_PIXELS))
      .composite([
        {blend: 'dest-in', input: headSilhouette},
        {blend: 'dest-out', input: createNoseExclusionMask()},
      ])
      .png()
      .toBuffer()
  const generatedMasks = await Promise.all([
    createMouthMask(MOUTH_SKIN_PATH),
    createMouthMask(OPEN_MOUTH_SKIN_PATH),
  ])
  const sharedMouthMask =
    sceneConfig.sharedMaskSource === undefined
      ? undefined
      : await createSharedMouthMask(
          path.join(workfileDirectory, sceneConfig.sharedMaskSource),
          sceneConfig.sharedMaskOffset,
        )
  const [mouthMask, openMouthMask] = sharedMouthMask
    ? [sharedMouthMask, sharedMouthMask]
    : generatedMasks
  const mouthRemovalMask = await sharp(
    createPathMask(
      sceneConfig.mouthRemovalPath ?? MOUTH_REMOVAL_PATH,
      MOUTH_REMOVAL_FEATHER_PIXELS,
    ),
  )
    .composite([
      {blend: 'dest-in', input: headSilhouette},
      {blend: 'dest-out', input: createNoseExclusionMask()},
    ])
    .png()
    .toBuffer()
  const mouthlessSourcePath = path.join(workfileDirectory, sceneConfig.mouthlessSource)
  const mouthlessPatch = await sharp(
    await createColorMatchedPatch(mouthlessSourcePath, originalPatch),
  )
    .composite([{blend: 'dest-in', input: mouthRemovalMask}])
    .png()
    .toBuffer()
  const mouthlessBasePatch = await sharp(originalPatch)
    .composite([{input: mouthlessPatch}])
    .png()
    .toBuffer()
  await sharp(mouthMask).png().toFile(path.join(workfileDirectory, sceneConfig.maskOutput))
  await sharp(openMouthMask)
    .png()
    .toFile(path.join(workfileDirectory, sceneConfig.maskOutput.replace('.png', '-open.png')))
  const mouthPaths = await Promise.all(
    visemes.map((viseme) =>
      createMouthAsset({
        mouthlessBasePatch,
        originalPatch,
        outerMask: viseme.extendsBelowLip ? openMouthMask : mouthMask,
        sceneDirectory,
        viseme,
        workfileDirectory,
      }),
    ),
  )
  await createMouthlessHeads(sceneDirectory, workfileDirectory, mouthlessPatch)
  await createPreview(sceneDirectory, workfileDirectory, mouthPaths)
}

await createAssets()

console.log(`Created ${visemes.length} lower-face mouth assets for ${sceneId}.`)
