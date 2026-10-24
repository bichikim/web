import type {Monitor} from '@tauri-apps/api/window'
import {type Accessor, createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {type DesktopMode, isDesktopBackgroundMode} from './model'

type MonitorReader = () => Promise<Monitor | null>

/** Returns the unavailable area above a desktop monitor's work area in logical pixels. */
export const getDesktopSafeAreaTop = (mode: DesktopMode, monitor: Monitor | null): number => {
  if (!isDesktopBackgroundMode(mode) || monitor === null) {
    return 0
  }

  return Math.max(0, (monitor.workArea.position.y - monitor.position.y) / monitor.scaleFactor)
}

/** Tracks the system UI inset only while the main window renders as the desktop background. */
export const useDesktopSafeAreaTop = (mode: Accessor<DesktopMode>): Accessor<number> => {
  const [inset, setInset] = createSignal(0)

  if (!(import.meta.env.VITE_POMO_IS_DESKTOP === 'true')) {
    return inset
  }

  const [monitorReader, setMonitorReader] = createSignal<MonitorReader | null>(null)
  const [measurementRevision, setMeasurementRevision] = createSignal(0)
  let disposed = false
  let requestId = 0
  let removeResizeListener: (() => void) | undefined
  let removeScaleListener: (() => void) | undefined

  createEffect(() => {
    const currentMode = mode()
    const readMonitor = monitorReader()
    measurementRevision()
    requestId += 1
    const currentRequestId = requestId

    if (!isDesktopBackgroundMode(currentMode) || readMonitor === null) {
      setInset(0)
      return
    }

    readMonitor()
      .then((monitor) => {
        if (!disposed && currentRequestId === requestId) {
          setInset(getDesktopSafeAreaTop(currentMode, monitor))
        }
      })
      .catch((error: unknown) => {
        if (!disposed && currentRequestId === requestId) {
          setInset(0)
          console.error('Failed to measure the desktop safe area.', error)
        }
      })
  })

  onMount(() => {
    import('@tauri-apps/api/window')
      .then(async ({currentMonitor, getCurrentWindow}) => {
        if (disposed) {
          return
        }

        const refresh = () => setMeasurementRevision((revision) => revision + 1)
        setMonitorReader(() => currentMonitor)
        const window = getCurrentWindow()
        const [unlistenResize, unlistenScale] = await Promise.all([
          window.onResized(refresh),
          window.onScaleChanged(refresh),
        ])

        if (disposed) {
          unlistenResize()
          unlistenScale()
          return
        }

        removeResizeListener = unlistenResize
        removeScaleListener = unlistenScale
      })
      .catch((error: unknown) => {
        if (!disposed) {
          console.error('Failed to initialize the desktop safe area.', error)
        }
      })
  })

  onCleanup(() => {
    disposed = true
    requestId += 1
    removeResizeListener?.()
    removeScaleListener?.()
  })

  return inset
}
