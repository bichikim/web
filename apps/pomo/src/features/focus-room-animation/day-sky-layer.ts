import cloudOverlayImage from './assets/layers/day-writing-focused/cloud-overlay.webp'
import skyMaskImage from './assets/layers/day-writing-focused/sky-mask-feathered.png'
import skyPanoramaImage from './assets/layers/day-writing-focused/sky-panorama.webp'
import type {PixiSceneLayerDefinition} from './layer-scene'

const DAY_SKY_MOTION = {
  from: {x: -4248, y: 0},
  kind: 'looping-translation',
  phase: 0.12,
  to: {x: 0, y: 0},
  travel: {maximumSeconds: 1980, minimumSeconds: 1620},
} as const

const DAY_CLOUD_OVERLAY_MOTION = {
  ...DAY_SKY_MOTION,
  travel: {maximumSeconds: 1380, minimumSeconds: 1020},
} as const

export const DAY_SKY_LAYERS = [
  {
    id: 'day-sky-panorama',
    maskSource: skyMaskImage,
    motion: DAY_SKY_MOTION,
    repeat: 'horizontal',
    source: skyPanoramaImage,
  },
  {
    id: 'day-sky-cloud-overlay',
    maskSource: skyMaskImage,
    motion: DAY_CLOUD_OVERLAY_MOTION,
    opacity: 0.18,
    repeat: 'horizontal',
    source: cloudOverlayImage,
  },
] satisfies readonly PixiSceneLayerDefinition[]
