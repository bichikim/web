import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'

const nightMouthNames = [
  'closed',
  'closed-round-early',
  'closed-round-late',
  'closed-wide-early',
  'closed-wide-late',
  'half-open',
  'narrow',
  'narrow-round-early',
  'narrow-round-late',
  'narrow-round-middle',
  'narrow-wide-early',
  'narrow-wide-late',
  'narrow-wide-middle',
  'open',
  'open-round-early',
  'open-round-late',
  'open-round-middle',
  'open-wide-early',
  'open-wide-late',
  'release',
  'rest',
  'round',
  'small-open',
  'wide',
]
const requiredAssets = [
  {
    directory: 'source',
    expectedHash: '672dc25ab969ce26b7ade41a100938e864d08bf3593409be01458384afe11c03',
    relativePath: 'day-reading-user/layer-mask-jaw-displacement.png',
  },
  {
    directory: 'runtime',
    expectedHash: 'cbb343dbdc1ca535e73609051177f50c7dc448a3166c262c98c4375cfa750a15',
    relativePath: 'day-reading-user/layer-mask-jaw-displacement.webp',
  },
  {
    directory: 'source',
    relativePath: 'night-reading-user/layer-head-eye-base.png',
  },
  {
    directory: 'source',
    relativePath: 'night-reading-user/layer-head.png',
  },
  {
    directory: 'source',
    expectedHash: '75b0208b4c61b70f3694ad95388b99f2cb4d79a294fff32479c3ab5c282155ab',
    relativePath: 'night-reading-user/layer-mask-jaw-displacement.png',
  },
  {
    directory: 'runtime',
    expectedHash: '4d067ed5cd54dd9a766f1804401fb725eff23eda5379805b370a123aff66fdc3',
    relativePath: 'night-reading-user/layer-mask-jaw-displacement.webp',
  },
  ...nightMouthNames.map((name) => ({
    directory: 'source',
    relativePath: `night-reading-user/layer-mouth-${name}.png`,
  })),
]

export const assertProtectedAssets = ({runtimeLayerDirectory, sourceLayerDirectory}) =>
  Promise.all(
    requiredAssets.map(async ({directory, expectedHash, relativePath}) => {
      const rootDirectory = directory === 'runtime' ? runtimeLayerDirectory : sourceLayerDirectory
      const assetPath = path.join(rootDirectory, relativePath)
      const asset = await readFile(assetPath)

      if (expectedHash === undefined) {
        return
      }

      const actualHash = createHash('sha256').update(asset).digest('hex')

      if (actualHash !== expectedHash) {
        throw new Error(`Protected asset changed and requires review: ${relativePath}`)
      }
    }),
  )
