import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {createPlayer, type Player, preparePuppetDocument} from '@winter-love/puppet/player'
import type {MouthPose} from '../character-speech/types'
import {connectCharacterBlink} from './blink'
import {getCharacterLook} from './get-character-look'
import geometry from '../../data/character-look.json'
import {createCanvasHitTest} from './create-canvas-hit-test'
import type {CharacterHitTest, CharacterPoint} from './types'

export * from './blink'
export * from './create-canvas-hit-test'
export * from './get-character-look'
export * from './types'

interface CharacterPreviewOptions {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly expressionId?: Accessor<string | null>
  readonly motionId?: Accessor<string>
  readonly mouth?: Accessor<MouthPose | null>
  readonly playing: Accessor<boolean>
  readonly onReady?: () => void
  readonly onError?: () => void
}

export const useCharacterPreview = (options: CharacterPreviewOptions) => {
  const RESOLUTION_LIMIT = 1.5
  const RENDER_SCALE = 1.5
  const HEAD_X_RANGE = 20
  const HEAD_Y_RANGE = 15
  const [player, setPlayer] = createSignal<Player | null>(null)
  let hitTest: CharacterHitTest | null = null
  createEffect(() => {
    const canvas = options.canvas()
    if (canvas === null) {
      return
    }
    const cancellation = new AbortController()
    let active: Player | null = null
    const load = async () => {
      const response = await fetch('/models/white-cat/model.poffo', {
        signal: cancellation.signal,
      })
      if (!response.ok) {
        throw new Error('Character download failed')
      }
      const source = await response.blob()
      const prepared = await preparePuppetDocument({signal: cancellation.signal, source})
      if (!prepared.ok) {
        throw new Error('Character document is invalid')
      }
      if (cancellation.signal.aborted) {
        return
      }
      let rendered = false
      const handleRender = () => {
        if (!rendered && !cancellation.signal.aborted) {
          rendered = true
          options.onReady?.()
        }
      }
      const created = await createPlayer({
        canvas,
        document: prepared.document,
        framing: 'viewport',
        onAfterRender: handleRender,
        resolution: Math.min(devicePixelRatio, RESOLUTION_LIMIT) * RENDER_SCALE,
      })
      if (cancellation.signal.aborted) {
        created.destroy()
        return
      }
      active = created
      hitTest = createCanvasHitTest({canvas, redraw: () => created.redraw()})
      created.setEyeBlink(false)
      created.setBreath(true)
      created.setPhysicsPreview(true)
      setPlayer(created)
    }
    load().catch((cause: unknown) => {
      if (!cancellation.signal.aborted) {
        console.error('Character preview failed', cause)
        options.onError?.()
      }
    })
    onCleanup(() => {
      cancellation.abort()
      hitTest = null
      setPlayer(null)
      active?.destroy()
    })
  })
  createEffect(() => {
    const active = player()
    const motionId = options.motionId?.() ?? 'Idle:0'
    active?.setMotion(motionId)
  })
  createEffect(() => {
    const active = player()
    const expressionId = options.expressionId?.() ?? null
    active?.setExpression(expressionId ?? undefined)
  })
  createEffect(() => {
    const active = player()
    if (options.playing()) {
      active?.resume()
    } else {
      active?.pause()
    }
  })
  createEffect(() => {
    const active = player()
    if (active !== null && options.playing()) {
      onCleanup(
        connectCharacterBlink({
          frames: {
            cancel: (handle) => cancelAnimationFrame(handle),
            request: (callback) => requestAnimationFrame(callback),
          },
          player: active,
          random: () => Math.random(),
        }),
      )
    }
  })
  createEffect(() => {
    const active = player()
    const mouth = options.mouth?.() ?? null
    if (mouth === null) {
      active?.clearParameterValues(['ParamMouthOpenY', 'ParamMouthForm'])
    } else {
      active?.patchParameterValues({ParamMouthForm: mouth.form, ParamMouthOpenY: mouth.open})
    }
  })
  const lookAt = (pointer?: {readonly x: number; readonly y: number}) => {
    const canvas = options.canvas()
    const view = canvas?.ownerDocument.defaultView
    const point =
      pointer !== undefined && canvas !== null && view
        ? getCharacterLook({
            bounds: canvas.getBoundingClientRect(),
            miniature: player()?.getParameterValue(geometry.miniatureParameter),
            pointer,
            viewport: {height: view.innerHeight, width: view.innerWidth},
          })
        : {x: 0, y: 0}
    player()?.patchParameterValues({
      ParamAngleX: point.x * HEAD_X_RANGE,
      ParamAngleY: point.y * HEAD_Y_RANGE,
      ParamEyeBallX: point.x,
      ParamEyeBallY: point.y,
    })
  }
  return {
    hitTest: (point: CharacterPoint) => hitTest?.(point) ?? false,
    lookAt,
    resize: () => player()?.resize(),
  }
}
