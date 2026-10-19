import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {isTauri} from '@tauri-apps/api/core'
import {currentMonitor, getCurrentWindow} from '@tauri-apps/api/window'
import type {TrackingViewport} from './types'

export const useViewport = (enabled: Accessor<boolean>, onError: (cause: unknown) => void) => {
  const [viewport, setViewport] = createSignal<TrackingViewport | null>(null)
  createEffect(() => {
    if (!enabled() || !isTauri()) {
      setViewport(null)
      return
    }
    let disposed = false
    let revision = 0
    const stops: (() => void)[] = []
    const window = getCurrentWindow()
    const refresh = async () => {
      revision += 1
      const request = revision
      const [monitor, position, scale] = await Promise.all([
        currentMonitor(),
        window.outerPosition(),
        window.scaleFactor(),
      ])
      if (!disposed && request === revision && monitor !== null) {
        setViewport({
          height: monitor.size.height,
          scale,
          width: monitor.size.width,
          x: position.x - monitor.position.x,
          y: position.y - monitor.position.y,
        })
      }
    }
    const report = (cause: unknown) => {
      if (!disposed) {
        onError(cause)
      }
    }
    const update = () => {
      refresh().catch(report)
    }
    const register = (stop: () => void) => {
      if (disposed) {
        stop()
      } else {
        stops.push(stop)
      }
    }
    window.onMoved(update).then(register).catch(report)
    window.onResized(update).then(register).catch(report)
    window.onScaleChanged(update).then(register).catch(report)
    update()
    onCleanup(() => {
      disposed = true
      stops.forEach((stop) => stop())
    })
  })
  return viewport
}
