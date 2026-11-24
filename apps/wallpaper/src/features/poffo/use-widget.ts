import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {type Accessor, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {createStore, reconcile} from 'solid-js/store'
import {menuActions} from '../semantics/menu-actions'
import {createBuiltinLibrary, createBuiltinSettings} from '../builtin-assets'
import type {PoffoWidget, WidgetSize} from '@winter-love/wallpaper/settings/library-model'
import {trackingProfile} from '@winter-love/wallpaper/settings/tracking-profile'
import {useWidgetSilhouette} from './use-widget-silhouette'
import type {FrameAlphaSample} from '@winter-love/puppet/player'

interface WidgetState {
  widget: PoffoWidget | null
}
export const useWidget = (id: Accessor<string>) => {
  const library = createBuiltinLibrary('wallpaper-library')
  const assets = createBuiltinSettings('wallpaper-settings')
  const [state, setState] = createStore<WidgetState>({widget: null})
  const assetId = () => state.widget?.assetId ?? null
  const silhouette = useWidgetSilhouette({
    assetId,
    load: assets.loadPuppetSilhouette,
    save: assets.savePuppetSilhouette,
  })
  const [error, setError] = createSignal<string | null>(null)
  const [actionError, setActionError] = createSignal<string | null>(null)
  let disposed = false
  let revision = 0
  let stopMove: (() => void) | null = null
  let pending = Promise.resolve()
  let silhouetteWrites = Promise.resolve()
  const captureSilhouette = (frame: FrameAlphaSample) => {
    const write = silhouette.capture(frame)
    if (write !== undefined) {
      silhouetteWrites = Promise.all([silhouetteWrites, write]).then(() => undefined)
    }
  }
  const report = (cause: unknown) => {
    if (!disposed) {
      console.error('Poffo widget failed', cause)
      setError('Poffo를 불러올 수 없어요.')
    }
  }
  const refresh = async () => {
    revision += 1
    const request = revision
    const currentId = id()
    try {
      const snapshot = await library.read()
      if (!disposed && request === revision) {
        setState(
          'widget',
          reconcile(snapshot.widgets.find((widget) => widget.id === currentId) ?? null),
        )
      }
    } catch (cause) {
      if (request === revision) {
        report(cause)
      }
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
    Promise.all([pending, silhouetteWrites])
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
    assetId,
    captureSilhouette,
    drag,
    error: () => actionError() ?? error(),
    lipsync: () => {
      const speech = state.widget?.speech
      return speech?.lipsync?.source === 'microphone' || speech?.enabled !== false
        ? speech?.lipsync
        : undefined
    },
    load: assets.loadPuppet,
    menuActions: registered,
    motionId: () => state.widget?.motionId,
    report,
    saveSize: (size: WidgetSize) => library.resizeWidget(id(), size),
    semanticBindings: () => state.widget?.speech?.semanticBindings,
    silhouette: silhouette.silhouette,
    toggleAction,
    touch: () => state.widget?.speech?.touch,
    tracking: () => state.widget?.tracking,
    trackingBindings: () => trackingProfile(state.widget ?? undefined).bindings,
    trackingOptions: () => trackingProfile(state.widget ?? undefined).options,
    wantsSilhouette: silhouette.needsCapture,
  }
}
