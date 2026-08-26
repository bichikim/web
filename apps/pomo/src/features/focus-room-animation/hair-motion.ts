import hairTipsMaskImage from './assets/layers/day-writing-focused/hair-tips-mask.webp'
import type {PixiScenePushEffect} from './layer-scene-definition'

export const HAIR_TIPS_PIXEL_PUSH = [
  {
    distance: {x: -4, y: 1.25},
    kind: 'masked-pixel-push',
    maskSource: hairTipsMaskImage,
  },
] satisfies readonly PixiScenePushEffect[]
