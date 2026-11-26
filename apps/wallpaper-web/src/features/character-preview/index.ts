import {type Accessor, createEffect, createSignal} from 'solid-js'
import {createPlayer, type Player, preparePuppetDocument} from '@winter-love/puppet/player'
import type {MouthPose} from '../character-speech/types'
import {connectCharacterBlink} from './blink'
import {getCharacterLook} from './get-character-look'
import {connectCharacterLook} from './look'
import {createPartHitTest} from './create-part-hit-test'
import geometry from '../../data/character-geometry.json'
import type {CharacterHitTest, CharacterPoint} from './types'

export * from './blink'
export * from './create-canvas-hit-test'
export * from './create-part-hit-test'
export * from './get-character-look'
export * from './look'
export * from './types'

interface CharacterPreviewOptions {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly coatOff?: Accessor<boolean>
  readonly expressionId?: Accessor<string | null>
  readonly motionId?: Accessor<string>
  readonly mouth?: Accessor<MouthPose | null>
  readonly playing: Accessor<boolean>
  readonly onReady?: () => void
  readonly onError?: () => void
}

const createReadyNotice = (onReady: (() => void) | undefined, signal: AbortSignal) => {
  let rendered = false
  let connected = false
  let notified = false
  const report = () => {
    if (rendered && connected && !notified && !signal.aborted) {
      notified = true
      onReady?.()
    }
  }
  return {
    connect() {
      connected = true
      report()
    },
    render() {
      rendered = true
      report()
    },
  }
}

const RESOLUTION_LIMIT = 1.5
const RENDER_SCALE = 1.5

export const useCharacterPreview = (options: CharacterPreviewOptions) => {
  const [look, setLook] = createSignal<ReturnType<typeof connectCharacterLook> | null>(null)
  const [player, setPlayer] = createSignal<Player | null>(null)
  let hitTest: CharacterHitTest | null = null
  createEffect(
    () => options.canvas(),
    (canvas) => {
      if (canvas === null) {
        return
      }
      const cancellation = new AbortController()
      let active: Player | null = null
      let gaze: ReturnType<typeof connectCharacterLook> | null = null
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
        const ready = createReadyNotice(options.onReady, cancellation.signal)
        const created = await createPlayer({
          buffering: true,
          canvas,
          document: prepared.document,
          framing: 'viewport',
          onFrame: ready.render,
          renderGeometryOnly: true,
          resolution: Math.min(devicePixelRatio, RESOLUTION_LIMIT) * RENDER_SCALE,
          workerRuntime: 'rust',
        })
        if (cancellation.signal.aborted) {
          created.destroy()
          return
        }
        active = created
        gaze = connectCharacterLook({
          frames: {
            cancel: (handle) => cancelAnimationFrame(handle),
            request: (callback) => requestAnimationFrame(callback),
          },
          parameters: prepared.document.parameters ?? [],
          player: created,
        })
        setLook(gaze)
        hitTest = createPartHitTest({canvas, player: created})
        created.setEyeBlink(false)
        created.setBreath(true)
        created.setPhysicsPreview(true)
        setPlayer(created)
        ready.connect()
      }
      load().catch((cause: unknown) => {
        if (!cancellation.signal.aborted) {
          console.error('Character preview failed', cause)
          options.onError?.()
        }
      })
      return () => {
        cancellation.abort()
        setLook(null)
        gaze?.release()
        hitTest = null
        setPlayer(null)
        active?.destroy()
      }
    },
  )
  createEffect(
    () => ({active: player(), motionId: options.motionId?.() ?? 'Idle:0'}),
    ({active, motionId}) => {
      active?.setMotion(motionId)
    },
  )
  createEffect(
    () => ({active: player(), expressionId: options.expressionId?.() ?? undefined}),
    ({active, expressionId}) => {
      active?.setExpression(expressionId)
    },
  )
  createEffect(
    () => ({active: player(), outfit: options.coatOff?.() ? '외투 벗기' : undefined}),
    ({active, outfit}) => {
      active?.setExpressionLayer('outfit', outfit)
    },
  )
  createEffect(
    () => ({active: player(), playing: options.playing()}),
    ({active, playing}) => {
      if (playing) {
        active?.resume()
      } else {
        active?.pause()
      }
    },
  )
  createEffect(
    () => (options.playing() ? player() : null),
    (active) => {
      if (active !== null) {
        return connectCharacterBlink({
          frames: {
            cancel: (handle) => cancelAnimationFrame(handle),
            request: (callback) => requestAnimationFrame(callback),
          },
          player: active,
          random: () => Math.random(),
        })
      }
    },
  )
  createEffect(
    () => ({active: player(), mouth: options.mouth?.() ?? null}),
    ({active, mouth}) => {
      if (mouth === null) {
        active?.clearParameterValues(['ParamMouthOpenY', 'ParamMouthForm'])
      } else {
        active?.patchParameterValues({ParamMouthForm: mouth.form, ParamMouthOpenY: mouth.open})
      }
    },
  )
  const lookAt = (pointer?: {readonly x: number; readonly y: number}) => {
    const canvas = options.canvas()
    const gaze = look()
    if (pointer === undefined || canvas === null) {
      gaze?.release()
      return
    }
    gaze?.follow(
      getCharacterLook({
        bounds: canvas.getBoundingClientRect(),
        miniature: player()?.getParameterValue(geometry.miniatureParameter),
        pointer,
      }),
    )
  }
  return {
    hitTest: (point: CharacterPoint) => hitTest?.(point) ?? false,
    lookAt,
    resize: () => player()?.resize(),
  }
}
