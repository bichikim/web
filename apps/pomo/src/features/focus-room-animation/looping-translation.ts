import {cosineEaseInOut} from 'src/utils/cosine-ease-in-out'
import type {Container} from 'pixi.js'

import type {PixiSceneLoopingTranslation} from './layer-scene-definition'

export const applyLoopingTranslation = (
  container: Container,
  sprite: Container,
  motion: PixiSceneLoopingTranslation,
  progress: number,
) => {
  const x = motion.from.x + (motion.to.x - motion.from.x) * progress
  const y = motion.from.y + (motion.to.y - motion.from.y) * progress
  container.position.set(x, y)

  if (motion.fade === undefined) {
    sprite.alpha = 1
    return
  }

  const edgeVisibility = Math.min(
    progress / motion.fade.edgeFraction,
    (1 - progress) / motion.fade.edgeFraction,
  )
  const easedVisibility = cosineEaseInOut(edgeVisibility)
  sprite.alpha = motion.fade.minimumOpacity + (1 - motion.fade.minimumOpacity) * easedVisibility
}
