import {State} from 'pixi.js'

/** The parts of PixiJS's WebGL back buffer system this module reads; `_state` is private. */
interface BackBufferPresentation {
  readonly _state?: unknown
  readonly useBackBuffer?: unknown
}

/**
 * PixiJS presents its WebGL back buffer with normal blending and without clearing the canvas,
 * so several renders before one browser presentation accumulate over transparent pixels.
 * Presenting with blending disabled copies the frame instead.
 *
 * PixiJS 8.21 offers no public option for the presentation blend mode, so this replaces the
 * private `GlBackBufferSystem._state`. Without a back buffer (or on WebGPU) there is nothing to
 * replace; when a PixiJS release no longer has that `State`, the default presentation stays
 * (`'unsupported'`) and only the accumulation above returns.
 */
export const replaceBackBufferPresentation = (
  backBuffer: unknown,
): 'replaced' | 'unsupported' | 'unused' => {
  const presentation = backBuffer as BackBufferPresentation | undefined
  if (presentation?.useBackBuffer !== true) {
    return 'unused'
  }
  if (!(presentation._state instanceof State)) {
    return 'unsupported'
  }
  presentation._state.blendMode = 'none'
  return 'replaced'
}
