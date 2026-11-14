import type {MotionEvent} from './playback/types'
import type {RuntimeNotice, RuntimeNoticesState} from './runtime-notice-types'

interface CompletionCallback {
  readonly callback: () => void
  readonly repeat: boolean
}
interface RegisterCompletionOptions {
  /** Keeps the callback for explicit replays until stopped; omitted, invoke once. */
  readonly repeat?: boolean
}
interface CreateRuntimeEffectsOptions {
  /** Receives motion events only after their frame is presented; omitted, events are ignored. */
  readonly onEvent?: (event: MotionEvent) => void
}

/** Owns host callbacks and acknowledges presented notices independently of rewound simulation. */
export const createRuntimeEffects = (options: CreateRuntimeEffectsOptions = {}) => {
  const callbacks = new Map<number, CompletionCallback>()
  let next = 1
  let acknowledged = 0
  let generation = 0
  const dispatchNotice = (notice: RuntimeNotice) => {
    switch (notice.kind) {
      case 'event':
        options.onEvent?.(notice.event)
        break
      case 'completion': {
        const callback = callbacks.get(notice.completion)
        if (!callback?.repeat) {
          callbacks.delete(notice.completion)
        }
        callback?.callback()
        break
      }
      default: {
        const exhaustive: never = notice
        throw new Error(`Unknown runtime notification: ${exhaustive}`)
      }
    }
  }
  return {
    acknowledged: () => acknowledged,
    cancel(token: number | undefined) {
      if (token !== undefined) {
        callbacks.delete(token)
      }
    },
    clear() {
      generation += 1
      callbacks.clear()
    },
    dispatch(state: RuntimeNoticesState) {
      const request = generation
      for (const notice of state.pending) {
        if (notice.sequence > acknowledged) {
          acknowledged = notice.sequence
          if (request === generation) {
            dispatchNotice(notice)
          }
        }
      }
      acknowledged = Math.max(acknowledged, state.sequence)
    },
    register(callback: (() => void) | undefined, configuration: RegisterCompletionOptions = {}) {
      if (callback === undefined) {
        return undefined
      }
      const token = next
      next += 1
      callbacks.set(token, {callback, repeat: configuration.repeat ?? false})
      return token
    },
    retain(tokens: ReadonlyArray<number>) {
      generation += 1
      const active = new Set(tokens)
      for (const token of callbacks.keys()) {
        if (!active.has(token)) {
          callbacks.delete(token)
        }
      }
    },
  }
}
