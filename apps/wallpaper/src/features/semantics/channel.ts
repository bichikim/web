import {isTauri} from '@tauri-apps/api/core'
import {emit, emitTo, listen} from '@tauri-apps/api/event'
import {
  SEMANTIC_ID_LIMIT,
  type SemanticFrame,
  semanticFrameSchema,
  type SemanticInput,
  semanticInputSchema,
} from '@winter-love/wallpaper/settings/semantics'

const INPUT = 'poffo-semantic-input'
const FRAME = 'poffo-semantic-frame'
const REQUEST = 'poffo-semantic-request'
const READY = 'poffo-semantic-ready'
const send = async (event: string, payload: unknown, label?: string) => {
  if (!isTauri()) {
    globalThis.dispatchEvent(new CustomEvent(event, {detail: payload}))
  } else if (label === undefined) {
    await emit(event, payload)
  } else {
    await emitTo(label, event, payload)
  }
}
const subscribe = async (event: string, receive: (value: unknown) => void) => {
  if (isTauri()) {
    return listen<unknown>(event, ({payload}) => receive(payload))
  }
  const handle = (value: Event) => {
    if (value instanceof CustomEvent) {
      receive(value.detail)
    }
  }
  globalThis.addEventListener(event, handle)
  return () => globalThis.removeEventListener(event, handle)
}
export const sendSemanticInput = (input: SemanticInput) =>
  send(INPUT, semanticInputSchema.parse(input), 'manager')
export const sendSemanticFrame = async (frame: SemanticFrame) => {
  const value = semanticFrameSchema.parse(frame)
  if (!isTauri()) {
    await send(FRAME, value)
    return
  }
  await Promise.all([
    send(FRAME, value, 'manager'),
    send(FRAME, value, `poffo-widget-${value.widgetId}`),
  ])
}
export const subscribeSemanticInput = (receive: (input: SemanticInput) => void) =>
  subscribe(INPUT, (value) => {
    const result = semanticInputSchema.safeParse(value)
    if (result.success) {
      receive(result.data)
    }
  })
export const subscribeSemanticFrame = (receive: (frame: SemanticFrame) => void) =>
  subscribe(FRAME, (value) => {
    const result = semanticFrameSchema.safeParse(value)
    if (result.success) {
      receive(result.data)
    }
  })
export const announceSemantics = () => send(READY, null)
export const subscribeSemanticReady = (receive: () => void) => subscribe(READY, receive)
export const requestSemanticFrame = (widgetId: string) => send(REQUEST, widgetId, 'manager')
export const subscribeSemanticRequests = (receive: (widgetId: string) => void) =>
  subscribe(REQUEST, (value) => {
    if (typeof value === 'string' && value.length <= SEMANTIC_ID_LIMIT) {
      receive(value)
    }
  })
