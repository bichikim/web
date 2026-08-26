import type {Container} from 'pixi.js'

import type {PixiSceneVisibilityCycle} from './layer-scene-definition'

export const applyVisibilityCycle = (
  sprite: Container,
  motion: PixiSceneVisibilityCycle,
  progress: number,
) => {
  sprite.visible = progress < motion.visibleFraction
}
