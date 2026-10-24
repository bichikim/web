import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWebview} from '@tauri-apps/api/webview'
import {
  getCurrentWindow,
  LogicalSize,
  type PhysicalPosition,
  type PhysicalSize,
} from '@tauri-apps/api/window'
import {createEffect, createSignal, onCleanup} from 'solid-js'
import {
  MAXIMUM_WIDGET_EDGE,
  MINIMUM_WIDGET_SIZE,
  type WidgetSize,
} from '@winter-love/wallpaper/settings/library-model'
import type {WidgetResizeDirection} from './types'

interface ResizeSnapshot {
  readonly size: PhysicalSize
  readonly position: PhysicalPosition
}
interface ResizeIdle {
  readonly status: 'idle' | 'starting'
}
interface ResizeActive {
  readonly status: 'editing' | 'committing'
  readonly snapshot: ResizeSnapshot
}
type ResizeState = ResizeIdle | ResizeActive
interface UseWidgetResizeProps {
  readonly onSave: (size: WidgetSize) => Promise<void>
}
interface ResizePointer {
  readonly button: number
  readonly preventDefault: () => void
  readonly stopPropagation: () => void
}
const KEYBOARD_STEP = 16

/** Owns native resize mode, completion persistence, and cancellation restoration. */
export const useWidgetResize = (props: UseWidgetResizeProps) => {
  const [state, setState] = createSignal<ResizeState>({status: 'idle'})
  const [error, setError] = createSignal<string | null>(null)
  const report = (cause: unknown) => {
    console.error('Poffo widget resize failed', cause)
    setError('크기를 조정하지 못했어요. 다시 시도해 주세요.')
  }
  createEffect(() => {
    if (!isTauri() || state().status !== 'editing') {
      return
    }
    let disposed = false
    let stop: (() => void) | null = null
    getCurrentWindow()
      .onResized(() => {
        if (!disposed) {
          getCurrentWebview().setFocus().catch(report)
        }
      })
      .then((unlisten) => {
        if (disposed) {
          unlisten()
        } else {
          stop = unlisten
        }
      })
      .catch(report)
    onCleanup(() => {
      disposed = true
      stop?.()
    })
  })
  const begin = async () => {
    if (!isTauri() || state().status !== 'idle') {
      return
    }
    setError(null)
    setState({status: 'starting'})
    try {
      const window = getCurrentWindow()
      const [size, position] = await Promise.all([window.innerSize(), window.outerPosition()])
      await window.setResizable(true)
      setState({snapshot: {position, size}, status: 'editing'})
    } catch (cause) {
      setState({status: 'idle'})
      report(cause)
    }
  }
  const finish = async () => {
    const current = state()
    if (current.status !== 'editing') {
      return
    }
    setError(null)
    setState({...current, status: 'committing'})
    try {
      const window = getCurrentWindow()
      const [size, scale] = await Promise.all([window.innerSize(), window.scaleFactor()])
      await props.onSave({height: size.height / scale, width: size.width / scale})
      await window.setResizable(false)
      setState({status: 'idle'})
    } catch (cause) {
      setState(current)
      report(cause)
    }
  }
  const cancel = async () => {
    const current = state()
    if (current.status !== 'editing') {
      return
    }
    setError(null)
    setState({...current, status: 'committing'})
    try {
      const window = getCurrentWindow()
      await window.setSize(current.snapshot.size)
      await window.setPosition(current.snapshot.position)
      await window.setResizable(false)
      setState({status: 'idle'})
    } catch (cause) {
      setState(current)
      report(cause)
    }
  }
  const resize = async (direction: WidgetResizeDirection, event: ResizePointer) => {
    if (state().status !== 'editing' || event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    try {
      const handled = await invoke<boolean>('start_poffo_resize', {direction})
      if (!handled) {
        await getCurrentWindow().startResizeDragging(direction)
      }
    } catch (cause) {
      report(cause)
    }
  }
  const keyboard = async (event: KeyboardEvent) => {
    if (state().status !== 'editing') {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      await cancel()
      return
    }
    const offsets: Readonly<Record<string, readonly [number, number]>> = {
      ArrowDown: [0, KEYBOARD_STEP],
      ArrowLeft: [-KEYBOARD_STEP, 0],
      ArrowRight: [KEYBOARD_STEP, 0],
      ArrowUp: [0, -KEYBOARD_STEP],
    }
    const offset = offsets[event.key]
    if (offset === undefined) {
      return
    }
    event.preventDefault()
    try {
      const window = getCurrentWindow()
      const [size, scale] = await Promise.all([window.innerSize(), window.scaleFactor()])
      await window.setSize(
        new LogicalSize(
          Math.min(
            MAXIMUM_WIDGET_EDGE,
            Math.max(MINIMUM_WIDGET_SIZE.width, size.width / scale + offset[0]),
          ),
          Math.min(
            MAXIMUM_WIDGET_EDGE,
            Math.max(MINIMUM_WIDGET_SIZE.height, size.height / scale + offset[1]),
          ),
        ),
      )
    } catch (cause) {
      report(cause)
    }
  }
  return {
    begin,
    busy: () => state().status === 'starting' || state().status === 'committing',
    cancel,
    editing: () => state().status === 'editing' || state().status === 'committing',
    error,
    finish,
    keyboard,
    resize,
  }
}
