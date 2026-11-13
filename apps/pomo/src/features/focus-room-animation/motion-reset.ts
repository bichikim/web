import {cosineEaseInOut} from 'src/utils/ease'
import {clampUnit} from 'src/utils/clamp-unit'
import type {Container} from 'pixi.js'

import {applyLoopingTranslation} from './looping-translation'
import type {PixiSceneMotion, PixiScenePoint} from './layer-scene-definition'
import {applyOpacityPulse} from './opacity-pulse'
import {applyVisibilityCycle} from './visibility-cycle'

interface ResetMotionPresentationOptions {
  /** Layer transform whose initial position and rotation are restored. */
  readonly container: Container
  /** Starting position selected for this reset. */
  readonly currentTarget: PixiScenePoint
  /** Motion definition controlling the restored presentation. */
  readonly motion: PixiSceneMotion
  /** Elapsed fraction of the complete sampled travel period. */
  readonly phase: number
  /** Layer view whose opacity or visibility is restored. */
  readonly sprite: Container
  /** Actual travel duration already sampled for this reset. */
  readonly travelSeconds: number
}

export const resetMotionPresentation = (options: ResetMotionPresentationOptions) => {
  const {container, currentTarget, motion, phase, sprite, travelSeconds} = options

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
    const transitionSeconds = motion.transitionSeconds ?? travelSeconds
    const transitionStart = travelSeconds - transitionSeconds
    const activePhase = clampUnit((phase * travelSeconds - transitionStart) / transitionSeconds, {
      fallback: 0,
    })
    const easedPhase = cosineEaseInOut(activePhase)
    applyOpacityPulse(sprite, motion, easedPhase)
  }

  if (motion.kind === 'visibility-cycle') {
    applyVisibilityCycle(sprite, motion, phase)
  }
}
