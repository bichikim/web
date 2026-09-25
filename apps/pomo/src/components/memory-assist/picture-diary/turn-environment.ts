import {getMonotonicTime} from 'src/utils/get-monotonic-time'
import type {Accessor} from 'solid-js'

export interface PageMetrics {
  readonly compact: boolean
  readonly height: number
  readonly left: number
  readonly pageWidth: number
  readonly top: number
}

export interface PageTurnPointerHandlers {
  readonly move: (event: PointerEvent) => void
  readonly up: (event: PointerEvent) => void
  readonly cancel: (event: PointerEvent) => void
}

/** Supplies a gesture clock, animation frames, live page measurements, and pointer subscriptions. */
export interface PageTurnEnvironment {
  readonly now: () => number
  readonly requestFrame: (callback: FrameRequestCallback) => number
  readonly cancelFrame: (id: number) => void
  readonly getMetrics: () => PageMetrics | null
  readonly prefersReducedMotion: () => boolean
  readonly listenPointers: (handlers: PageTurnPointerHandlers) => () => void
}

interface BrowserTurnOptions {
  readonly surface?: Accessor<HTMLDivElement | undefined>
}

export const createBrowserTurnEnvironment = (options: BrowserTurnOptions): PageTurnEnvironment => ({
  cancelFrame: (id) => cancelAnimationFrame(id),
  getMetrics: () => {
    const bounds = options.surface?.()?.getBoundingClientRect()
    if (bounds === undefined || bounds.width <= 0 || bounds.height <= 0) {
      return null
    }
    const compact = globalThis.matchMedia?.('(width < 48rem)').matches ?? false
    return {
      compact,
      height: bounds.height,
      left: bounds.left,
      pageWidth: compact ? bounds.width : bounds.width / 2,
      top: bounds.top,
    }
  },
  listenPointers: (handlers) => {
    globalThis.addEventListener('pointermove', handlers.move, {passive: false})
    globalThis.addEventListener('pointerup', handlers.up)
    globalThis.addEventListener('pointercancel', handlers.cancel)
    return () => {
      globalThis.removeEventListener('pointermove', handlers.move)
      globalThis.removeEventListener('pointerup', handlers.up)
      globalThis.removeEventListener('pointercancel', handlers.cancel)
    }
  },
  now: () => getMonotonicTime(),
  prefersReducedMotion: () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  requestFrame: (callback) => requestAnimationFrame(callback),
})
