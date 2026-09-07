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

/** Supplies one monotonic timeline, live page measurements, and scoped pointer subscriptions. */
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
    const compact = window.matchMedia?.('(width < 48rem)').matches ?? false
    return {
      compact,
      height: bounds.height,
      left: bounds.left,
      pageWidth: compact ? bounds.width : bounds.width / 2,
      top: bounds.top,
    }
  },
  listenPointers: (handlers) => {
    window.addEventListener('pointermove', handlers.move, {passive: false})
    window.addEventListener('pointerup', handlers.up)
    window.addEventListener('pointercancel', handlers.cancel)
    return () => {
      window.removeEventListener('pointermove', handlers.move)
      window.removeEventListener('pointerup', handlers.up)
      window.removeEventListener('pointercancel', handlers.cancel)
    }
  },
  now: () => performance.now(),
  prefersReducedMotion: () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  requestFrame: (callback) => requestAnimationFrame(callback),
})
