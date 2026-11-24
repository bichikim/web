import {isTauri} from '@tauri-apps/api/core'
import {emitTo, listen} from '@tauri-apps/api/event'
import type {MicrophoneRequest, MicrophoneState} from './types'

const STATE = 'poffo-microphone-state'
const REQUEST = 'poffo-microphone-request'
const PHASES = ['off', 'starting', 'listening', 'error'] as const
const isDevices = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (device) =>
      device !== null &&
      typeof device === 'object' &&
      'id' in device &&
      typeof device.id === 'string' &&
      'label' in device &&
      typeof device.label === 'string',
  )
const isState = (value: unknown): value is MicrophoneState =>
  value !== null &&
  typeof value === 'object' &&
  'widgetId' in value &&
  typeof value.widgetId === 'string' &&
  'phase' in value &&
  PHASES.some((phase) => phase === value.phase) &&
  'level' in value &&
  typeof value.level === 'number' &&
  Number.isFinite(value.level) &&
  value.level >= 0 &&
  value.level <= 1 &&
  (!('error' in value) || typeof value.error === 'string') &&
  (!('devices' in value) || isDevices(value.devices))
const send = (event: string, value: MicrophoneState | MicrophoneRequest, label: string) =>
  isTauri()
    ? emitTo(label, event, value)
    : Promise.resolve(globalThis.dispatchEvent(new CustomEvent(event, {detail: value})))
const subscribe = async (event: string, receive: (value: unknown) => void) => {
  if (isTauri()) {
    return listen<unknown>(event, ({payload}) => receive(payload))
  }
  const handle = (event: Event) => {
    if (event instanceof CustomEvent) {
      receive(event.detail)
    }
  }
  globalThis.addEventListener(event, handle)
  return () => globalThis.removeEventListener(event, handle)
}

/** Delivers the latest level in order, including a final stopped or failed state. */
export const createMicrophonePublisher = (widgetId: string) => {
  let pending: MicrophoneState | null = null
  let active = false
  const drain = async () => {
    active = true
    try {
      while (pending !== null) {
        const state = pending
        pending = null
        // oxlint-disable-next-line no-await-in-loop -- Keep closing states behind already submitted levels.
        await send(STATE, {...state, widgetId}, 'manager').catch((cause: unknown) =>
          console.error('Microphone state delivery failed', cause),
        )
      }
    } finally {
      active = false
    }
  }
  return (state: MicrophoneState) => {
    pending = state
    if (!active) {
      drain().catch(console.error)
    }
  }
}
export const subscribeMicrophoneState = (
  widgetId: string,
  receive: (state: MicrophoneState) => void,
) =>
  subscribe(STATE, (value) => {
    if (isState(value) && value.widgetId === widgetId) {
      receive(value)
    }
  })
export const requestMicrophone = (request: MicrophoneRequest) =>
  send(REQUEST, request, `poffo-widget-${request.widgetId}`)
export const subscribeMicrophoneRequests = (
  widgetId: string,
  receive: (request: MicrophoneRequest) => void,
) =>
  subscribe(REQUEST, (value) => {
    if (
      value !== null &&
      typeof value === 'object' &&
      'widgetId' in value &&
      value.widgetId === widgetId &&
      'action' in value &&
      (value.action === 'read' || value.action === 'retry')
    ) {
      receive({action: value.action, widgetId})
    }
  })
