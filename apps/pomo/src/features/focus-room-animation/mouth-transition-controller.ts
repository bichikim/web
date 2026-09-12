import {clampUnit} from 'src/utils/clamp-unit'

import type {PViseme} from '../lip-sync'
import type {PVisemeTransition} from './scene-layer-state'

export const P_MOUTH_TRANSITION_DURATION_MS = 100

export interface PMouthTransitionController {
  readonly current: PVisemeTransition | null
  readonly cancel: () => void
  readonly destroy: () => void
  readonly start: (from: PViseme, to: PViseme, prefersReducedMotion: boolean) => void
}

/** Supplies asynchronous animation frames and a clock with the same time origin. */
export interface PMouthTransitionScheduler {
  readonly cancelAnimationFrame: (frame: number) => void
  readonly now: () => number
  readonly requestAnimationFrame: (callback: (timestamp: number) => void) => number
}

const DEFAULT_SCHEDULER: PMouthTransitionScheduler = {
  cancelAnimationFrame: (frame) => globalThis.cancelAnimationFrame(frame),
  now: () => globalThis.performance.now(),
  requestAnimationFrame: (callback) => globalThis.requestAnimationFrame(callback),
}

const SMOOTHSTEP_SCALE = 3
const SMOOTHSTEP_CURVE = 2
const getSmoothedUnitProgress = (progress: number) => {
  const linearProgress = clampUnit(progress)
  return linearProgress * linearProgress * (SMOOTHSTEP_SCALE - SMOOTHSTEP_CURVE * linearProgress)
}

export const getPVisemeTransitionProgress = (elapsedMs: number) =>
  getSmoothedUnitProgress(elapsedMs / P_MOUTH_TRANSITION_DURATION_MS)

/** Owns the short requestAnimationFrame loop used to crossfade mouth sprites. */
export const createPMouthTransitionController = (
  onTransitionChange: () => void,
  scheduler: PMouthTransitionScheduler = DEFAULT_SCHEDULER,
): PMouthTransitionController => {
  let current: PVisemeTransition | null = null
  let frame: number | null = null
  let destroyed = false

  const cancel = () => {
    if (frame !== null) {
      scheduler.cancelAnimationFrame(frame)
      frame = null
    }

    current = null
  }

  const start = (from: PViseme, to: PViseme, prefersReducedMotion: boolean) => {
    const previousTransition = current
    const reversesCurrentTransition =
      previousTransition?.from === to && previousTransition.to === from
    const transitionFrom = reversesCurrentTransition ? previousTransition.from : from
    const transitionTo = reversesCurrentTransition ? previousTransition.to : to
    const startProgress = reversesCurrentTransition ? previousTransition.progress : 0
    const endProgress = reversesCurrentTransition ? 0 : 1
    cancel()

    if (prefersReducedMotion || from === to) {
      onTransitionChange()
      return
    }

    const durationMs = Math.abs(endProgress - startProgress) * P_MOUTH_TRANSITION_DURATION_MS

    if (durationMs === 0) {
      onTransitionChange()
      return
    }

    const startedAt = scheduler.now()
    current = {from: transitionFrom, progress: startProgress, to: transitionTo}
    onTransitionChange()

    const renderFrame = (timestamp: number) => {
      if (destroyed) {
        return
      }

      const phase = getSmoothedUnitProgress((timestamp - startedAt) / durationMs)
      const progress = startProgress + (endProgress - startProgress) * phase
      current = {from: transitionFrom, progress, to: transitionTo}
      onTransitionChange()

      if (phase < 1) {
        frame = scheduler.requestAnimationFrame(renderFrame)
        return
      }

      frame = null
      current = null
      onTransitionChange()
    }

    frame = scheduler.requestAnimationFrame(renderFrame)
  }

  const destroy = () => {
    destroyed = true
    cancel()
  }

  return {
    cancel,
    get current() {
      return current
    },
    destroy,
    start,
  }
}
