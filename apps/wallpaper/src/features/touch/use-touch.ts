import {startTouchAnimation} from './start-touch-animation'
import {tapOffsets} from './tap-offsets'
import {dragOffsets} from './drag-offsets'
import {type Accessor, createEffect, createMemo, onCleanup} from 'solid-js'
import {snapshotTouchSettings} from './snapshot-touch-settings'
import type {PuppetParameterBlend} from '@winter-love/puppet/player'
import {createTouchSession, type TouchPlayer, type TouchSession} from './create-touch-session'
import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import type {TouchHandlers, TouchParameter, TouchPoint} from './types'

interface UseTouchOptions {
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly player: Accessor<TouchPlayer | null>
  readonly parameters: Accessor<readonly TouchParameter[]>
  readonly options: Accessor<PoffoTouch | undefined>
}
const DRAG_THRESHOLD = 4
const additiveBlends = (
  values: Readonly<Record<string, number>>,
): Readonly<Record<string, PuppetParameterBlend>> =>
  Object.fromEntries(Object.entries(values).map(([id, value]) => [id, {mode: 'add', value}]))

/** Adds transient touch offsets without replacing tracking, speech, or animation inputs. */
export const useTouch = (options: UseTouchOptions): TouchHandlers => {
  const settings = createMemo(() => snapshotTouchSettings(options.options()))
  let session: TouchSession | null = null
  let owner: ReturnType<UseTouchOptions['player']> = null
  let offsets: Readonly<Record<string, number>> = {}
  let stopAnimation: (() => void) | undefined
  const write = (values: Readonly<Record<string, number>>) => {
    offsets = values
    owner?.patchParameterBlends(additiveBlends(values), 'interaction')
  }
  const clear = () => {
    stopAnimation?.()
    stopAnimation = undefined
    if (Object.keys(offsets).length > 0) {
      owner?.patchParameterBlends(
        Object.fromEntries(Object.keys(offsets).map((id) => [id, undefined])),
        'interaction',
      )
    }
    offsets = {}
    owner = null
  }
  const cancel = () => {
    session?.joints?.cancel()
    session = null
    clear()
  }
  const animate = (values: Readonly<Record<string, number>>, duration: number, pulse: boolean) => {
    stopAnimation = startTouchAnimation({
      duration,
      onComplete: clear,
      onFrame: write,
      onPeak: pulse ? release : undefined,
      pulse,
      values,
    })
  }
  const release = () => {
    const physical = new Set(owner?.releaseParameterPhysics(Object.keys(offsets)) ?? [])
    offsets = Object.fromEntries(Object.entries(offsets).filter(([id]) => !physical.has(id)))
    return offsets
  }
  const start = (event: PointerEvent) => {
    const configuration = settings()
    const player = options.player()
    const canvas = options.canvas()
    if (
      !configuration?.enabled ||
      (!configuration.click && !configuration.drag) ||
      player === null ||
      canvas === null ||
      event.button !== 0 ||
      event.ctrlKey
    ) {
      return
    }
    cancel()
    const current = createTouchSession({
      canvas,
      offsets: () => offsets,
      parameters: options.parameters(),
      player,
      point: {x: event.clientX, y: event.clientY},
      pointerId: event.pointerId,
      settings: configuration,
      write,
    })
    if (current === null) {
      return
    }
    owner = player
    session = current
    canvas.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const move = (event: PointerEvent) => {
    const current = session
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    const point = {x: event.clientX, y: event.clientY}
    const dragged =
      current.dragged ||
      Math.hypot(point.x - current.origin.x, point.y - current.origin.y) > DRAG_THRESHOLD
    if (!dragged) {
      return
    }
    current.dragged = true
    if (current.settings.drag) {
      if (current.joints === undefined) {
        write(
          dragOffsets({
            offsets,
            parameters: current.parameters,
            point,
            previous: current.previous,
            settings: current.settings,
            shift: event.shiftKey,
          }),
        )
      } else {
        const bounds = current.canvas.getBoundingClientRect()
        current.joints.move({x: point.x - bounds.left, y: point.y - bounds.top})
      }
    }
    current.previous = point
  }
  const finish = (event: PointerEvent) => {
    const current = session
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    move(event)
    current.joints?.cancel()
    session = null
    if (current.dragged) {
      release()
      if (Object.keys(offsets).length > 0) {
        animate(offsets, current.settings.returnDuration, false)
      } else {
        clear()
      }
    } else if (current.settings.click) {
      const values = tapOffsets({
        parameters: current.parameters,
        settings: current.settings,
        values: owner?.getParameterValues() ?? {},
      })
      animate(values, current.settings.returnDuration, true)
    } else {
      clear()
    }
  }
  createEffect(() => {
    options.player()
    settings()
    options.parameters()
    cancel()
  })
  onCleanup(cancel)
  const lostCapture = () => {
    if (session !== null) {
      cancel()
    }
  }
  return {cancel, finish, lostCapture, move, start}
}
