import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {AGENT_STATES, type AgentSignals} from '@winter-love/wallpaper/settings/agent-state'

const parse = (value: unknown): AgentSignals => {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return Object.fromEntries(AGENT_STATES.map(({value: key}) => [key, source[key] === true]))
}
export const selectAgentSession = async (sessionId: string | null): Promise<void> => {
  if (isTauri()) {
    await invoke('select_poffo_speech', {sessionId})
  }
}
const eventName = (widgetId?: string) =>
  widgetId === undefined ? 'poffo-agent-state' : `poffo-agent-state:${widgetId}`
export const readAgentSignals = async (widgetId?: string): Promise<AgentSignals> =>
  isTauri() ? parse(await invoke<unknown>('poffo_agent_state', {widgetId})) : {}

export const subscribeAgentSignals = async (
  receive: (signals: AgentSignals) => void,
  widgetId?: string,
): Promise<() => void> => {
  if (isTauri()) {
    return listen<unknown>(eventName(widgetId), ({payload}) => receive(parse(payload)))
  }
  const handle = (event: Event) => {
    if (event instanceof CustomEvent) {
      receive(parse(event.detail))
    }
  }
  globalThis.addEventListener(eventName(widgetId), handle)
  return () => globalThis.removeEventListener(eventName(widgetId), handle)
}
