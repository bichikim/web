import type {Page} from 'playwright/test'
import type {CodexSnapshot, CodexSpeechTarget} from '../../src/features/codex/types'
import type {WallpaperMonitor} from '../../src/features/settings/monitors'

interface NativePreview {
  monitors: readonly WallpaperMonitor[]
  snapshot: CodexSnapshot
  target: CodexSpeechTarget
  readonly unexpected: string[]
  readonly emit: (target: string | null, event: string, payload: unknown) => void
}

declare global {
  var wallpaperNative: NativePreview
}

export const installNative = async (page: Page, label = 'manager') => {
  await page.addInitScript((label) => {
    interface NativeListener {
      readonly event: string
      readonly callback: number
      readonly label: string | null
    }
    interface NativeCallback {
      (event: unknown): void
    }
    const callbacks = new Map<number, NativeCallback>()
    const listeners = new Map<number, NativeListener>()
    let identifier = 0
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- addInitScript serializes this callback without outer helpers.
    const targetLabel = (target: unknown) =>
      typeof target === 'object' &&
      target !== null &&
      'label' in target &&
      typeof target.label === 'string'
        ? target.label
        : null
    const state: NativePreview = {
      emit(target, event, payload) {
        for (const [id, listener] of listeners) {
          if (
            listener.event === event &&
            (target === null || listener.label === null || listener.label === target)
          ) {
            callbacks.get(listener.callback)?.({event, id, payload})
          }
        }
      },
      monitors: [
        {id: 'first', name: 'First'},
        {id: 'second', name: 'Second'},
      ],
      snapshot: {activity: null, received: false, recent: [], registered: false, sessions: []},
      target: {
        anchor: 'bottom',
        insetBottom: 0,
        insetTop: 0,
        maxHeight: 600,
        positionX: 0.9,
        positionY: 0.05,
        widgetHeight: 400,
        widgetWidth: 200,
        x: 100,
        y: 100,
      },
      unexpected: [],
    }
    Object.assign(globalThis, {
      __TAURI_EVENT_PLUGIN_INTERNALS__: {
        unregisterListener: (_event: string, id: number) => listeners.delete(id),
      },
      __TAURI_INTERNALS__: {
        async invoke(command: string, args: Record<string, unknown> = {}) {
          switch (command) {
            case 'plugin:event|listen':
              identifier += 1
              listeners.set(identifier, {
                callback: Number(args.handler),
                event: String(args.event),
                label: targetLabel(args.target),
              })
              return identifier
            case 'plugin:event|unlisten':
              listeners.delete(Number(args.eventId))
              return
            case 'plugin:event|emit':
              state.emit(null, String(args.event), args.payload)
              return
            case 'plugin:event|emit_to':
              state.emit(targetLabel(args.target), String(args.event), args.payload)
              return
            case 'list_wallpaper_monitors':
              return state.monitors
            case 'codex_bridge_status':
              return state.snapshot
            case 'poffo_speech_target':
              return state.target
            case 'poffo_agent_state':
              return {}
            case 'codex_thread_title':
              return null
            case 'set_widget_hit_region':
            case 'clear_widget_hit_region':
              return
            default:
              state.unexpected.push(command)
              throw new Error(`Unexpected native command: ${command}`)
          }
        },
        metadata: {currentWebview: {label}, currentWindow: {label}},
        transformCallback(callback: (event: unknown) => void) {
          identifier += 1
          callbacks.set(identifier, callback)
          return identifier
        },
      },
      isTauri: true,
      wallpaperNative: state,
    })
  }, label)
}
