import breathingMaskImage from './assets/layers/breathing-mask.webp'
import type {PixiScenePixelOscillation} from './layer-scene-definition'

export const BREATHING_MOTION = {
  effects: [
    {
      distance: {x: 0, y: -3},
      kind: 'masked-pixel-push',
      maskSource: breathingMaskImage,
    },
  ],
  kind: 'pixel-oscillation',
  travel: {maximumSeconds: 2.5, minimumSeconds: 2.2},
} satisfies PixiScenePixelOscillation
