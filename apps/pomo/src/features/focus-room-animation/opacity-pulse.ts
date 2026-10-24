import type {Container} from 'pixi.js'

import type {PixiSceneOpacityPulse} from './layer-scene-definition'

export const applyOpacityPulse = (
  sprite: Container,
  motion: PixiSceneOpacityPulse,
  progress: number,
) => {
  sprite.alpha = motion.minimumOpacity + (motion.maximumOpacity - motion.minimumOpacity) * progress
}
