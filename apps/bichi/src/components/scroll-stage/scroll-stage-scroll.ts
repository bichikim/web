import {setBodyHeight} from './scroll-stage-dom'
import {clamp, lerp} from './scroll-stage-math'
import {EASE, SOFT_THRESHOLD} from './scroll-stage-settings'

export interface Viewport {
  height: number
  width: number
}

export interface ScrollMetrics {
  hard: number
  height: number
  limit: number
  normalized: number
  soft: number
}

export interface ScrollState {
  metrics: ScrollMetrics
  running: boolean
}

export interface ScrollStateOptions {
  ease?: number
  setBodyHeight?: (height: number) => void
  softThreshold?: number
}

export interface ScrollStateController {
  onScroll: () => void
  setViewport: (viewport: Viewport) => void
  state: ScrollState
  updatePosition: (scrollY: number) => void
  updateSizes: () => void
}

export function createScrollState(
  scrollContentElement: HTMLElement,
  options: ScrollStateOptions = {},
): ScrollStateController {
  let viewport: Viewport = {height: window.innerHeight, width: window.innerWidth}

  const state: ScrollState = {
    metrics: {hard: 0, height: 0, limit: 0, normalized: 0, soft: 0},
    running: false,
  }

  const ease = options.ease ?? EASE
  const softThreshold = options.softThreshold ?? SOFT_THRESHOLD
  const applyBodyHeight = options.setBodyHeight ?? setBodyHeight

  const setViewport = (next: Viewport) => {
    viewport = next
  }

  const updateSizes = () => {
    state.metrics.height = scrollContentElement.getBoundingClientRect().height
    state.metrics.limit = scrollContentElement.clientHeight - viewport.height
    applyBodyHeight(state.metrics.height)
  }

  const updatePosition = (scrollY: number) => {
    const {metrics} = state

    metrics.hard = clamp(0, metrics.limit, scrollY)
    metrics.soft = lerp(metrics.soft, metrics.hard, ease)

    if (metrics.soft < softThreshold) {
      metrics.soft = 0
    }

    metrics.normalized = metrics.limit > 0 ? metrics.soft / metrics.limit : 0
  }

  const onScroll = () => {
    if (!state.running) {
      state.running = true

      requestAnimationFrame(() => {
        state.running = false
      })
    }
  }

  return {onScroll, setViewport, state, updatePosition, updateSizes}
}
