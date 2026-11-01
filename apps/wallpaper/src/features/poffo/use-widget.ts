import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {type Accessor, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {menuActions} from '../semantics/menu-actions'
import {createBuiltinSettings} from '../builtin-assets'
import type {PoffoWidget, WidgetSize} from '@winter-love/wallpaper/settings/library-model'

interface WidgetState {
  widget: PoffoWidget | null
}
export const useWidget = (id: Accessor<string>) => {
  const library = createLibraryRepository('wallpaper-library')
  const assets = createBuiltinSettings('wallpaper-settings')
  const [state, setState] = createStore<WidgetState>({widget: null})
  const [error, setError] = createSignal<string | null>(null)
  const [actionError, setActionError] = createSignal<string | null>(null)
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
      setState(
        'widget',
        reconcile(snapshot.widgets.find((widget) => widget.id === currentId) ?? null),
      )
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
  const registered = createMemo(() => menuActions(state.widget?.speech?.semanticBindings ?? []))
  const toggleAction = (bindingId: string) => {
    const widgetId = id()
    pending = pending
      .then(async () => {
        if (!disposed) {
          await library.toggleWidgetAction(widgetId, bindingId)
          if (!disposed) {
            setActionError(null)
          }
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          console.error('Poffo action update failed', cause)
          setActionError('행동을 변경하지 못했어요.')
        }
      })
    return pending
  }
  return {
    agentBindings: () => state.widget?.speech?.agentBindings,
    assetId: () => state.widget?.assetId ?? null,
    drag,
    error: () => actionError() ?? error(),
    lipsync: () =>
      state.widget?.speech?.enabled === false ? undefined : state.widget?.speech?.lipsync,
    load: assets.loadPuppet,
    menuActions: registered,
    motionId: () => state.widget?.motionId,
    report,
    saveSize: (size: WidgetSize) => library.resizeWidget(id(), size),
    semanticBindings: () => state.widget?.speech?.semanticBindings,
    toggleAction,
    tracking: () => state.widget?.tracking,
    trackingBindings: () => state.widget?.trackingBindings,
    trackingOptions: () => state.widget?.trackingOptions,
  }
}
