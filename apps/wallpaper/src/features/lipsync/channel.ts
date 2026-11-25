import type {LipSyncMotion, LipSyncPose, LipSyncWeights} from './types'
import {isTauri} from '@tauri-apps/api/core'
import {emitTo, listen} from '@tauri-apps/api/event'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {
  LIP_SYNC_SHAPES,
  type LipSyncShape,
  type LipSyncSource,
} from '@winter-love/wallpaper/settings/lipsync'

export interface LipSyncFrame {
  readonly widgetId: string
  readonly source: Exclude<LipSyncSource, 'off'>
  readonly level: number
  readonly weights?: LipSyncWeights
  readonly openingWeights?: LipSyncWeights
  readonly shape?: LipSyncShape | null
  readonly motion?: LipSyncMotion
}
const EVENT = 'poffo-lipsync'
const WEIGHT_TOLERANCE = 0.000001
const isLevel = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
const isMotion = (value: unknown): value is LipSyncMotion =>
  value !== null &&
  typeof value === 'object' &&
  'phase' in value &&
  (value.phase === 'prepare' || value.phase === 'hold' || value.phase === 'release') &&
  'weight' in value &&
  isLevel(value.weight)
const isWeights = (value: unknown): value is LipSyncWeights =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([key, weight]) =>
      LIP_SYNC_SHAPES.some((shape) => shape === key) &&
      typeof weight === 'number' &&
      Number.isFinite(weight) &&
      weight >= 0 &&
      weight <= 1,
  ) &&
  Object.values(value).reduce((sum: number, weight: number) => sum + weight, 0) <=
    1 + WEIGHT_TOLERANCE
const isFrame = (value: unknown): value is LipSyncFrame =>
  value !== null &&
  typeof value === 'object' &&
  'widgetId' in value &&
  typeof value.widgetId === 'string' &&
  'source' in value &&
  (value.source === 'voice' || value.source === 'speech' || value.source === 'microphone') &&
  'level' in value &&
  isLevel(value.level) &&
  (!('weights' in value) || isWeights(value.weights)) &&
  (!('openingWeights' in value) || isWeights(value.openingWeights)) &&
  (!('motion' in value) || isMotion(value.motion)) &&
  (!('shape' in value) ||
    value.shape === null ||
    LIP_SYNC_SHAPES.some((shape) => shape === value.shape))

const sendLocal = (frame: LipSyncFrame) =>
  globalThis.dispatchEvent(new CustomEvent(EVENT, {detail: frame}))

/** Keeps one destination ordered without delaying other destinations. */
const createNativeDelivery = (label: string) => {
  let pending: LipSyncFrame | null = null
  let sending = false
  const drain = async () => {
    sending = true
    try {
      while (pending !== null) {
        const frame = pending
        pending = null
        // oxlint-disable-next-line no-await-in-loop -- Each destination preserves its own closing pose.
        await emitTo(label, EVENT, frame).catch((cause: unknown) =>
          console.error('Poffo lip sync delivery failed', cause),
        )
      }
    } finally {
      sending = false
    }
  }
  return (frame: LipSyncFrame) => {
    pending = frame
    if (!sending) {
      drain().catch((cause: unknown) => console.error('Poffo lip sync delivery failed', cause))
    }
  }
}

/** Delivers local poses immediately; remote destinations independently coalesce pending frames. */
export const createLipSyncPublisher = (widgetId: string) => {
  const targets = [`poffo-widget-${widgetId}`, 'manager']
  const native = isTauri()
  const local = native ? getCurrentWindow().label : undefined
  const deliver = native ? targets.filter((label) => label !== local).map(createNativeDelivery) : []
  return (
    source: LipSyncFrame['source'],
    level: number,
    shape?: LipSyncShape | null,
    pose?: LipSyncPose,
  ) => {
    const frame: LipSyncFrame = {
      ...(pose?.weights === undefined ? {} : {weights: pose.weights}),
      ...(pose?.openingWeights === undefined ? {} : {openingWeights: pose.openingWeights}),
      ...(pose?.motion === undefined ? {} : {motion: pose.motion}),
      level: Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0,
      shape: shape ?? null,
      source,
      widgetId,
    }
    if (!native || (local !== undefined && targets.includes(local))) {
      sendLocal(frame)
    }
    deliver.forEach((send) => send(frame))
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
  const handle = (event: Event) => {
    if (event instanceof CustomEvent) {
      accept(event.detail)
    }
  }
  const stopLocal = () => globalThis.removeEventListener(EVENT, handle)
  globalThis.addEventListener(EVENT, handle)
  try {
    const stopNative = isTauri()
      ? await listen<unknown>(EVENT, ({payload}) => accept(payload))
      : undefined
    return () => {
      stopLocal()
      stopNative?.()
    }
  } catch (cause) {
    stopLocal()
    throw cause
  }
}
