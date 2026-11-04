import {type Accessor, createEffect, onCleanup, untrack} from 'solid-js'
import type {Player} from '../../player'
import {observeInheritedStyle} from './observe-inherited-style'
import {
  createSpatialThreeOverlay,
  type SpatialThreeOverlay,
  type SpatialThreeSurface,
} from './spatial-three-overlay'
interface SpatialOverlayOptions {
  /** Active canvas owned by PlayerCanvas. Undefined, no overlay can be created. */
  readonly canvas: Accessor<HTMLCanvasElement | undefined>
  /** Active renderer, used only to request a redraw after selection changes. */
  readonly player: Accessor<Player | null>
  /** Selected editing surface. Undefined clears the overlay's content. */
  readonly surface: Accessor<SpatialThreeSurface | undefined>
  /** Reports overlay initialization failures; called without tracking consumer signals. */
  readonly onError: (message: string) => void
}
/** Owns the optional spatial overlay; dispose it before replacing the underlying canvas. */
export const useSpatialOverlay = (options: SpatialOverlayOptions) => {
  let overlay: SpatialThreeOverlay | undefined
  const dispose = () => {
    overlay?.destroy()
    overlay = undefined
  }
  createEffect(() => {
    const canvas = options.canvas()
    const player = options.player()
    const surface = options.surface()
    if (canvas !== undefined && player !== null && surface !== undefined) {
      onCleanup(
        observeInheritedStyle({
          element: canvas,
          onChange: () => player.redraw(),
          properties: ['--spatial-mesh-face', '--spatial-mesh-edge', '--spatial-mesh-light'],
        }),
      )
    }
  })
  createEffect(() => {
    const current = options.player()
    const canvas = options.canvas()
    const surface = options.surface()
    if (current === null || canvas === undefined) {
      return
    }
    if (overlay === undefined && surface !== undefined) {
      try {
        overlay = createSpatialThreeOverlay(canvas)
      } catch (error) {
        untrack(() =>
          options.onError(
            error instanceof Error ? error.message : '3D 메시를 표시하지 못했습니다.',
          ),
        )
        return
      }
    }
    if (overlay !== undefined) {
      overlay.update(surface)
      current.redraw()
    }
  })
  onCleanup(dispose)
  return {dispose, prepare: () => overlay?.prepare(), render: () => overlay?.render()}
}
