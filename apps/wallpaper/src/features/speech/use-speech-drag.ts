import {invoke, isTauri} from '@tauri-apps/api/core'
import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {
  POFFO_SPEECH_BOUNDS,
  type PoffoSpeech,
  type PoffoSpeechPosition,
} from '@winter-love/wallpaper/settings/library-model'
import type {CodexSpeechTarget} from '../codex/types'
import type {SpeechPoint} from './types'

interface UseSpeechDragProps {
  readonly widgetId: Accessor<string | undefined>
  readonly speech: Accessor<PoffoSpeech>
  readonly target: Accessor<CodexSpeechTarget | undefined>
}
interface SpeechDrag {
  readonly pointerId: number
  readonly handle: HTMLElement
  readonly start: SpeechPoint
  readonly origin: PoffoSpeechPosition
  readonly position: SpeechPoint
  readonly anchor: 'top' | 'bottom'
  readonly width: number
  readonly height: number
}
const THRESHOLD = 4
const constrain = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const PRECISION = 4
const dragPoint = (options: {
  readonly gesture: SpeechDrag
  readonly x: number
  readonly y: number
}): PoffoSpeechPosition => {
  return {
    anchor: options.gesture.anchor,
    x: Number(
      constrain(
        options.gesture.position.x + options.x / options.gesture.width,
        POFFO_SPEECH_BOUNDS.minX,
        POFFO_SPEECH_BOUNDS.maxX,
      ).toFixed(PRECISION),
    ),
    y: Number(
      constrain(
        options.gesture.position.y + options.y / options.gesture.height,
        POFFO_SPEECH_BOUNDS.minY,
        POFFO_SPEECH_BOUNDS.maxY,
      ).toFixed(PRECISION),
    ),
  }
}

export const useSpeechDrag = (props: UseSpeechDragProps) => {
  const [dragging, setDragging] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let active: SpeechDrag | null = null
  let point: PoffoSpeechPosition | null = null
  let pending: PoffoSpeechPosition | null = null
  let running: Promise<void> | null = null
  let saving = false
  let suppressed: HTMLElement | null = null
  const flush = async () => {
    while (pending !== null) {
      const next = pending
      pending = null
      // oxlint-disable-next-line no-await-in-loop -- Native placement requests must finish in order.
      await invoke('move_poffo_speech', {...next})
    }
  }
  const publish = (next: PoffoSpeechPosition) => {
    pending = next
    running ??= flush().finally(() => {
      running = null
    })
    return running
  }
  const release = (gesture: SpeechDrag) => {
    active = null
    point = null
    setDragging(false)
    if (gesture.handle.hasPointerCapture(gesture.pointerId)) {
      gesture.handle.releasePointerCapture(gesture.pointerId)
    }
  }
  const report = (cause: unknown) => {
    pending = null
    console.error('Poffo speech placement failed', cause)
    setError('말풍선 위치를 저장하지 못했어요.')
  }
  const cancel = () => {
    const gesture = active
    if (gesture === null) {
      return
    }
    const moved = dragging()
    release(gesture)
    if (moved) {
      suppressed = gesture.handle
      publish(gesture.origin).catch(report)
    }
  }
  onCleanup(cancel)
  const start = (event: PointerEvent) => {
    const target = props.target()
    const handle =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-speech-drag-handle]')
        : null
    if (
      !isTauri() ||
      event.button !== 0 ||
      saving ||
      active !== null ||
      props.widgetId() === undefined ||
      handle === null ||
      target?.widgetWidth === undefined ||
      target.widgetHeight === undefined ||
      target.widgetWidth <= 0 ||
      target.widgetHeight <= 0
    ) {
      return
    }
    suppressed = null
    setError(null)
    const speech = props.speech()
    active = {
      anchor: target.anchor ?? 'bottom',
      handle,
      height: target.widgetHeight,
      origin: {anchor: speech.anchor, x: speech.x, y: speech.y},
      pointerId: event.pointerId,
      position: {x: target.positionX ?? speech.x, y: target.positionY ?? speech.y},
      start: {x: event.screenX, y: event.screenY},
      width: target.widgetWidth,
    }
  }
  const move = (event: PointerEvent) => {
    const gesture = active
    if (gesture === null || event.pointerId !== gesture.pointerId) {
      return
    }
    const x = event.screenX - gesture.start.x
    const y = event.screenY - gesture.start.y
    if (!dragging() && Math.hypot(x, y) < THRESHOLD) {
      return
    }
    event.preventDefault()
    if (!dragging()) {
      gesture.handle.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    point = dragPoint({gesture, x, y})
    publish(point).catch(report)
  }
  const finish = async (event: PointerEvent) => {
    const gesture = active
    const id = props.widgetId()
    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return
    }
    move(event)
    const next = point
    release(gesture)
    if (next === null || id === undefined) {
      return
    }
    suppressed = gesture.handle
    saving = true
    const repository = createLibraryRepository('wallpaper-library')
    try {
      await publish(next)
      await repository.moveSpeech(id, next)
    } catch (cause) {
      report(cause)
      await publish(gesture.origin).catch(report)
    } finally {
      repository.close()
      saving = false
    }
  }
  const click = (event: MouseEvent) => {
    if (
      suppressed !== null &&
      event.detail !== 0 &&
      event.target instanceof Node &&
      suppressed.contains(event.target)
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && active !== null) {
      event.preventDefault()
      cancel()
    }
  }
  return {cancel, click, dragging, error, finish, keyboard, move, start}
}
