import {createPositionWriter} from './create-position-writer'
import {type Accessor, batch, createEffect, createSignal, onCleanup} from 'solid-js'
import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow, LogicalPosition} from '@tauri-apps/api/window'

interface UseWidgetMoveOptions {
  /** Whether a new pointer gesture may begin. */
  readonly enabled: Accessor<boolean>
  /** Adjustment mode permits positioning without the stationary hold. */
  readonly immediate: Accessor<boolean>
  readonly onError: (cause: unknown) => void
}
interface MovePoint {
  readonly x: number
  readonly y: number
}
interface MoveSession {
  readonly id: number
  readonly target: HTMLElement
  origin: MovePoint
  pointer: MovePoint
  position?: MovePoint
  readonly started: number
  eligible: boolean
  ready: boolean
  cancelled: boolean
}
export const MOVE_HOLD_SECONDS = 1.5
const MILLISECONDS_PER_SECOND = 1000
const HOLD_DURATION = MOVE_HOLD_SECONDS * MILLISECONDS_PER_SECOND
const HOLD_TOLERANCE = 4
const PENDING_PROGRESS = 0.95

const moveTarget = (event: PointerEvent): HTMLElement | undefined =>
  event.button === 0 &&
  !event.ctrlKey &&
  event.target instanceof HTMLElement &&
  event.target.closest('button,input,textarea,[role="menu"]') === null
    ? event.target
    : undefined

const readWindowPosition = async (): Promise<MovePoint> => {
  const window = getCurrentWindow()
  const [origin, scale] = await Promise.all([window.outerPosition(), window.scaleFactor()])
  return {x: origin.x / scale, y: origin.y / scale}
}

const dragPosition = (current: MoveSession): LogicalPosition | undefined =>
  current.position === undefined
    ? undefined
    : new LogicalPosition(
        current.position.x + current.pointer.x - current.origin.x,
        current.position.y + current.pointer.y - current.origin.y,
      )

const createMoveSession = (event: PointerEvent, target: HTMLElement): MoveSession => {
  const point = {x: event.screenX, y: event.screenY}
  return {
    cancelled: false,
    eligible: false,
    id: event.pointerId,
    origin: point,
    pointer: point,
    ready: false,
    started: event.timeStamp,
    target,
  }
}

/** Separates stationary hold-to-move from ordinary character touch dragging. */
export const useWidgetMove = (options: UseWidgetMoveOptions) => {
  const [hold, setHold] = createSignal<(MovePoint & {readonly progress: number}) | null>(null)
  const [active, setActive] = createSignal(false)
  const [moving, setMoving] = createSignal(false)
  let session: MoveSession | null = null
  let frame: number | undefined
  const write = createPositionWriter(options.onError)
  const stopFrame = () => {
    if (frame !== undefined) {
      cancelAnimationFrame(frame)
      frame = undefined
    }
  }
  const position = (current: MoveSession) => {
    const next = dragPosition(current)
    if (next !== undefined) {
      write(next)
    }
  }
  const activate = (current: MoveSession) => {
    if (
      session !== current ||
      current.cancelled ||
      current.ready ||
      !current.eligible ||
      current.position === undefined
    ) {
      return
    }
    current.ready = true
    batch(() => {
      setHold((previous) => (previous === null ? null : {...previous, progress: 1}))
      setMoving(true)
    })
    if (current.pointer.x !== current.origin.x || current.pointer.y !== current.origin.y) {
      position(current)
    }
  }
  const completeHold = (current: MoveSession) => {
    stopFrame()
    current.eligible = true
    current.origin = current.pointer
    if (current.position === undefined) {
      setHold((previous) => (previous === null ? null : {...previous, progress: PENDING_PROGRESS}))
    }
    activate(current)
  }
  const prepare = (current: MoveSession) => {
    readWindowPosition()
      .then((position) => {
        if (session !== current || current.cancelled) {
          return
        }
        current.position = position
        activate(current)
      })
      .catch((cause: unknown) => {
        if (session === current) {
          cancel()
          options.onError(cause)
        }
      })
  }
  const tick = (time: number) => {
    frame = undefined
    const current = session
    if (current === null || current.cancelled || current.eligible) {
      return
    }
    const progress = Math.max(0, Math.min(1, (time - current.started) / HOLD_DURATION))
    if (progress === 1) {
      completeHold(current)
    } else {
      const shown = current.position === undefined ? Math.min(progress, PENDING_PROGRESS) : progress
      setHold((previous) => (previous === null ? null : {...previous, progress: shown}))
      frame = requestAnimationFrame(tick)
    }
  }
  const cancel = () => {
    const current = session
    session = null
    stopFrame()
    setHold(null)
    setActive(false)
    setMoving(false)
    if (current?.target.hasPointerCapture(current.id)) {
      current.target.releasePointerCapture(current.id)
    }
  }
  const start = (event: PointerEvent) => {
    const target = moveTarget(event)
    if (!isTauri() || !options.enabled() || target === undefined) {
      return
    }
    cancel()
    const current = createMoveSession(event, target)
    session = current
    current.target.setPointerCapture(current.id)
    setActive(true)
    prepare(current)
    if (options.immediate()) {
      completeHold(current)
    } else {
      setHold({progress: 0, x: event.clientX, y: event.clientY})
      frame = requestAnimationFrame(tick)
    }
  }
  const move = (event: PointerEvent) => {
    const current = session
    if (current === null || current.id !== event.pointerId || current.cancelled) {
      return
    }
    if (!current.eligible && event.timeStamp - current.started >= HOLD_DURATION) {
      completeHold(current)
    }
    current.pointer = {x: event.screenX, y: event.screenY}
    if (current.ready) {
      position(current)
      return
    }
    if (
      !current.eligible &&
      Math.hypot(current.pointer.x - current.origin.x, current.pointer.y - current.origin.y) >
        HOLD_TOLERANCE
    ) {
      current.cancelled = true
      setHold(null)
      stopFrame()
    } else {
      setHold((previous) =>
        previous === null ? null : {...previous, x: event.clientX, y: event.clientY},
      )
    }
  }
  const finish = (event: PointerEvent) => {
    if (session?.id !== event.pointerId) {
      return
    }
    move(event)
    cancel()
  }
  createEffect(() => {
    if (!options.enabled()) {
      cancel()
    }
  })
  onCleanup(cancel)
  return {active, cancel, finish, hold, move, moving, start}
}
