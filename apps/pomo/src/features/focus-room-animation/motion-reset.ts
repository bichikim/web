import type {Container, Sprite} from 'pixi.js'

import {applyLoopingTranslation} from './looping-translation'
import type {PixiSceneMotion, PixiScenePoint} from './layer-scene-definition'
import {applyOpacityPulse} from './opacity-pulse'
import {applyVisibilityCycle} from './visibility-cycle'

interface ResetMotionPresentationOptions {
  readonly container: Container
  readonly currentTarget: PixiScenePoint
  readonly motion: PixiSceneMotion
  readonly phase: number
  readonly sprite: Sprite
}

export const resetMotionPresentation = (options: ResetMotionPresentationOptions) => {
  const {container, currentTarget, motion, phase, sprite} = options

  if (motion.kind === 'pivot-rotation') {
    container.position.set(motion.center.x, motion.center.y)
    container.rotation = 0
  }

  if (motion.kind === 'translation') {
    container.position.set(currentTarget.x, currentTarget.y)
  }

  if (motion.kind === 'looping-translation') {
    applyLoopingTranslation(container, sprite, motion, phase)
  }

  if (motion.kind === 'opacity-pulse') {
    const easedPhase = (1 - Math.cos(phase * Math.PI)) / 2
    applyOpacityPulse(sprite, motion, easedPhase)
  }

  if (motion.kind === 'visibility-cycle') {
    applyVisibilityCycle(sprite, motion, phase)
  }
}
