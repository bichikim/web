import type {Sprite} from 'pixi.js'

import type {PixiSceneOpacityPulse} from './layer-scene-definition'

export const applyOpacityPulse = (
  sprite: Sprite,
  motion: PixiSceneOpacityPulse,
  progress: number,
) => {
  sprite.alpha = motion.minimumOpacity + (motion.maximumOpacity - motion.minimumOpacity) * progress
}
