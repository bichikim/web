import {type Accessor, createEffect, onCleanup, untrack} from 'solid-js'
import type {Player, PlayerRenderingOptions} from '../../player'

interface PlayerRenderingConfiguration {
  readonly player: Accessor<Player | null>
  readonly configuration: Accessor<PlayerRenderingOptions>
  readonly onApplied: (canvas: HTMLCanvasElement) => void
  readonly onError: (message: string) => void
}

/** Applies GPU settings independently of the document and the player's simulation lifecycle. */
export const usePlayerRendering = (options: PlayerRenderingConfiguration) => {
  let pending = false
  let sequence = 0
  let observed: Player | null = null
  createEffect(() => {
    const current = options.player()
    const configuration = options.configuration()
    if (observed !== current) {
      observed = current
      pending = false
      sequence += 1
    }
    if (current === null) {
      return
    }
    const actual = current.getRenderingInfo()
    const antialiasing = configuration.antialiasing === 'ssaa' ? 'ssaa' : 'msaa'
    if (
      !pending &&
      actual.antialiasing === antialiasing &&
      (configuration.renderer === 'auto' || configuration.renderer === actual.renderer)
    ) {
      return
    }
    pending = true
    sequence += 1
    const request = sequence
    let active = true
    onCleanup(() => {
      active = false
    })
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-label', '모델 뷰어')
    current
      .configureRenderer({...configuration, canvas})
      .then((result) => {
        if (request === sequence) {
          pending = false
        }
        // A newer preference may still be preparing; the applied surface must remain visible.
        if (result === 'applied' && untrack(options.player) === current) {
          untrack(() => options.onApplied(canvas))
        }
      })
      .catch((cause: unknown) => {
        if (request === sequence) {
          pending = false
        }
        if (active && untrack(options.player) === current) {
          untrack(() =>
            options.onError(
              cause instanceof Error ? cause.message : '렌더러를 변경하지 못했습니다.',
            ),
          )
        }
      })
  })
}
