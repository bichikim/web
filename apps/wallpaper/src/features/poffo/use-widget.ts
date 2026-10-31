import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {type Accessor, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {createBuiltinSettings} from '../builtin-assets'
import type {PoffoWidget, WidgetSize} from '@winter-love/wallpaper/settings/library-model'

export const useWidget = (id: Accessor<string>) => {
  const library = createLibraryRepository('wallpaper-library')
  const assets = createBuiltinSettings('wallpaper-settings')
  const [widget, setWidget] = createSignal<PoffoWidget | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let disposed = false
  let stopMove: (() => void) | null = null
  let pending = Promise.resolve()
  const report = (cause: unknown) => {
    if (!disposed) {
      console.error('Poffo widget failed', cause)
      setError('Poffo를 불러올 수 없어요.')
    }
  }
  const refresh = async () => {
    const currentId = id()
    const snapshot = await library.read()
    if (!disposed) {
      setWidget(snapshot.widgets.find((widget) => widget.id === currentId) ?? null)
    }
  }
  const stopLibrary = library.subscribe(() => {
    refresh().catch(report)
  }, report)
  createEffect(() => {
    refresh().catch(report)
  })
  onMount(() => {
    if (!isTauri()) {
      return
    }
    getCurrentWindow()
      .onMoved(({payload}) => {
        const currentId = id()
        pending = pending
          .then(async () => {
            if (!disposed) {
              await library.moveWidget(currentId, {x: payload.x, y: payload.y})
            }
          })
          .catch(report)
      })
      .then((stop) => {
        if (disposed) {
          stop()
        } else {
          stopMove = stop
        }
      })
      .catch(report)
  })
  onCleanup(() => {
    disposed = true
    stopLibrary()
    stopMove?.()
    pending
      .finally(() => {
        library.close()
        assets.close()
      })
      .catch(report)
  })
  const drag = (event: PointerEvent) => {
    if (
      !isTauri() ||
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button') !== null)
    ) {
      return
    }
    getCurrentWindow().startDragging().catch(report)
  }
  return {
    agentBindings: () => widget()?.speech?.agentBindings,
    assetId: () => widget()?.assetId ?? null,
    drag,
    error,
    lipsync: () => (widget()?.speech?.enabled === false ? undefined : widget()?.speech?.lipsync),
    load: assets.loadPuppet,
    motionId: () => widget()?.motionId,
    report,
    saveSize: (size: WidgetSize) => library.resizeWidget(id(), size),
    semanticBindings: () => widget()?.speech?.semanticBindings,
    tracking: () => widget()?.tracking,
    trackingBindings: () => widget()?.trackingBindings,
    trackingOptions: () => widget()?.trackingOptions,
  }
}
