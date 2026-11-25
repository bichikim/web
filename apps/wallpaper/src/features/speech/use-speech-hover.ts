import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'
import {type Accessor, createEffect, onCleanup} from 'solid-js'
import type {CursorPosition} from '../tracking/types'
import type {SpeechPoint} from './types'

interface UseSpeechHoverProps {
  readonly element: Accessor<HTMLElement | null>
  readonly onMove: () => void
  readonly onLeave: () => void
}
const report = (cause: unknown) => console.error('Poffo speech hover unavailable', cause)

/** Uses the existing global cursor stream while the speech webview is inactive. */
export const useSpeechHover = (props: UseSpeechHoverProps) => {
  createEffect(() => {
    const element = props.element()
    if (!isTauri() || element === null) {
      return
    }
    let disposed = false
    let stop: (() => void) | null = null
    let previous: SpeechPoint | null = null
    const subscription = crypto.randomUUID()
    const receive = (position: CursorPosition) => {
      const viewport = element.ownerDocument.defaultView
      if (disposed || viewport === null || position.width <= 0 || position.height <= 0) {
        return
      }
      const point = {
        x: (position.x / position.width) * viewport.innerWidth,
        y: (position.y / position.height) * viewport.innerHeight,
      }
      if (point.x === previous?.x && point.y === previous.y) {
        return
      }
      previous = point
      const hit = element.ownerDocument.elementFromPoint(point.x, point.y)
      if (hit !== null && element.contains(hit) && hit.closest('[role="listitem"]') !== null) {
        props.onMove()
      } else {
        props.onLeave()
      }
    }
    const connect = async () => {
      const unsubscribe = await getCurrentWebviewWindow().listen<CursorPosition>(
        'poffo-cursor',
        ({payload}) => receive(payload),
      )
      if (disposed) {
        unsubscribe()
        return
      }
      stop = unsubscribe
      await invoke('subscribe_poffo_cursor', {enabled: true, subscription})
      if (disposed) {
        await invoke('subscribe_poffo_cursor', {enabled: false, subscription})
      }
    }
    connect().catch(report)
    onCleanup(() => {
      disposed = true
      stop?.()
      invoke('subscribe_poffo_cursor', {enabled: false, subscription}).catch(report)
    })
  })
}
