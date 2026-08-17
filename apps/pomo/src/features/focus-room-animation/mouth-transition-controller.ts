import {P_VISEME_COARTICULATION_MS, type PViseme} from '../lip-sync'
import type {PVisemeTransition} from './scene-layer-state'

export interface PMouthTransitionController {
  readonly current: PVisemeTransition | null
  readonly cancel: () => void
  readonly destroy: () => void
  readonly start: (from: PViseme, to: PViseme, prefersReducedMotion: boolean) => void
}

const SMOOTHSTEP_SCALE = 3
const SMOOTHSTEP_CURVE = 2

export const getPVisemeTransitionProgress = (elapsedMs: number) => {
  const linearProgress = Math.min(1, Math.max(0, elapsedMs / P_VISEME_COARTICULATION_MS))
  return linearProgress * linearProgress * (SMOOTHSTEP_SCALE - SMOOTHSTEP_CURVE * linearProgress)
}

/** Owns the short requestAnimationFrame loop used to crossfade mouth sprites. */
export const createPMouthTransitionController = (
  onTransitionChange: () => void,
): PMouthTransitionController => {
  let current: PVisemeTransition | null = null
  let frame: number | null = null
  let destroyed = false

  const cancel = () => {
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
      frame = null
    }

    current = null
  }

  const start = (from: PViseme, to: PViseme, prefersReducedMotion: boolean) => {
    cancel()

    if (prefersReducedMotion || from === to) {
      onTransitionChange()
      return
    }

    const startedAt = window.performance.now()
    current = {from, progress: 0, to}
    onTransitionChange()

    const renderFrame = (timestamp: number) => {
      if (destroyed) {
        return
      }

      const progress = getPVisemeTransitionProgress(timestamp - startedAt)
      current = {from, progress, to}
      onTransitionChange()

      if (progress < 1) {
        frame = window.requestAnimationFrame(renderFrame)
        return
      }

      frame = null
      current = null
      onTransitionChange()
    }

    frame = window.requestAnimationFrame(renderFrame)
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
