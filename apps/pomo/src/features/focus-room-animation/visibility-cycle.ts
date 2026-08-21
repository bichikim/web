import type {Sprite} from 'pixi.js'

import type {PixiSceneVisibilityCycle} from './layer-scene-definition'

export const applyVisibilityCycle = (
  sprite: Sprite,
  motion: PixiSceneVisibilityCycle,
  progress: number,
) => {
  sprite.visible = progress < motion.visibleFraction
}
