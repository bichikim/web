import {isTauri} from '@tauri-apps/api/core'
import {emitTo, listen} from '@tauri-apps/api/event'
import {
  LIP_SYNC_SHAPES,
  type LipSyncShape,
  type LipSyncSource,
} from '@winter-love/wallpaper/settings/lipsync'

export interface LipSyncFrame {
  readonly widgetId: string
  readonly source: Exclude<LipSyncSource, 'off'>
  readonly level: number
  readonly shape?: LipSyncShape | null
}
const EVENT = 'poffo-lipsync'
const isFrame = (value: unknown): value is LipSyncFrame =>
  value !== null &&
  typeof value === 'object' &&
  'widgetId' in value &&
  typeof value.widgetId === 'string' &&
  'source' in value &&
  (value.source === 'voice' || value.source === 'speech') &&
  'level' in value &&
  typeof value.level === 'number' &&
  Number.isFinite(value.level) &&
  value.level >= 0 &&
  value.level <= 1 &&
  (!('shape' in value) ||
    value.shape === null ||
    LIP_SYNC_SHAPES.some((shape) => shape === value.shape))

const send = async (frame: LipSyncFrame) => {
  if (!isTauri()) {
    globalThis.dispatchEvent(new CustomEvent(EVENT, {detail: frame}))
    return
  }
  const deliveries = await Promise.allSettled([
    emitTo(`poffo-widget-${frame.widgetId}`, EVENT, frame),
    emitTo('manager', EVENT, frame),
  ])
  const failures = deliveries.filter((delivery) => delivery.status === 'rejected')
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((delivery) => delivery.reason),
      'Poffo lip sync delivery failed',
    )
  }
}

/** Coalesces pending levels while preserving delivery order to the character and its preview. */
export const createLipSyncPublisher = (widgetId: string) => {
  let pending: LipSyncFrame | null = null
  let sending = false
  const drain = async () => {
    sending = true
    try {
      while (pending !== null) {
        const frame = pending
        pending = null
        // Each native delivery must finish before its replacement, including the closing zero.
        // oxlint-disable-next-line no-await-in-loop
        await send(frame).catch((cause: unknown) =>
          console.error('Poffo lip sync delivery failed', cause),
        )
      }
    } finally {
      sending = false
    }
  }
  return (source: LipSyncFrame['source'], level: number, shape?: LipSyncShape | null) => {
    pending = {
      level: Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0,
      shape: shape ?? null,
      source,
      widgetId,
    }
    if (!sending) {
      drain().catch((cause: unknown) => console.error('Poffo lip sync delivery failed', cause))
    }
  }
}

/** Subscribes only to validated frames for one widget. */
export const subscribeLipSync = async (
  widgetId: string,
  receive: (frame: LipSyncFrame) => void,
): Promise<() => void> => {
  const accept = (value: unknown) => {
    if (isFrame(value) && value.widgetId === widgetId) {
      receive(value)
    }
  }
  if (isTauri()) {
    return listen<unknown>(EVENT, ({payload}) => accept(payload))
  }
  const handle = (event: Event) => {
    if (event instanceof CustomEvent) {
      accept(event.detail)
    }
  }
  globalThis.addEventListener(EVENT, handle)
  return () => globalThis.removeEventListener(EVENT, handle)
}
