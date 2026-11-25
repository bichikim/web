import {cacheDirectory, prepareModelAsset} from '@winter-love/model-cache'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import model from '../tracking-model.json' with {type: 'json'}
import poseModel from '../tracking-pose-model.json' with {type: 'json'}
import bodyModel from '../tracking-body-model.json' with {type: 'json'}

export const trackingDirectory = join(
  cacheDirectory('io.winterlove.models'),
  'face-detector',
  model.sha256,
)
const poseDirectory = join(
  cacheDirectory('io.winterlove.models'),
  'face-landmarker',
  poseModel.sha256,
)
const bodyDirectory = join(
  cacheDirectory('io.winterlove.models'),
  'pose-landmarker',
  bodyModel.sha256,
)
export const trackingAssets = [
  {dest: 'tracking-runtime', src: join(trackingDirectory, model.path)},
  {dest: 'tracking-runtime', src: join(poseDirectory, poseModel.path)},
  {dest: 'tracking-runtime', src: join(bodyDirectory, bodyModel.path)},
]
export const prepareTrackingAssets = () =>
  Promise.all([
    prepareModelAsset(trackingDirectory, model, model.url, [
      fileURLToPath(new URL('../src/features/tracking/assets', import.meta.url)),
    ]),
    prepareModelAsset(poseDirectory, poseModel, poseModel.url),
    prepareModelAsset(bodyDirectory, bodyModel, bodyModel.url),
  ])
