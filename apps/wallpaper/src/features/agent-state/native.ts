import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {AGENT_STATES, type AgentSignals} from '@winter-love/wallpaper/settings/agent-state'

const parse = (value: unknown): AgentSignals => {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return Object.fromEntries(AGENT_STATES.map(({value: key}) => [key, source[key] === true]))
}
export const readAgentSignals = async (): Promise<AgentSignals> =>
  isTauri() ? parse(await invoke<unknown>('poffo_agent_state')) : {}

export const subscribeAgentSignals = async (
  receive: (signals: AgentSignals) => void,
): Promise<() => void> => {
  if (isTauri()) {
    return listen<unknown>('poffo-agent-state', ({payload}) => receive(parse(payload)))
  }
  const handle = (event: Event) => {
    if (event instanceof CustomEvent) {
      receive(parse(event.detail))
    }
  }
  globalThis.addEventListener('poffo-agent-state', handle)
  return () => globalThis.removeEventListener('poffo-agent-state', handle)
}
