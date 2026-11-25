/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {selectAgentSession, subscribeAgentSignals} from '../native'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => vi.resetAllMocks())
it('should deliver state changes only to the matching widget', async () => {
  vi.mocked(isTauri).mockReturnValue(false)
  const first = vi.fn()
  const second = vi.fn()
  const stopFirst = await subscribeAgentSignals(first, 'one')
  const stopSecond = await subscribeAgentSignals(second, 'two')
  try {
    globalThis.dispatchEvent(new CustomEvent('poffo-agent-state:one', {detail: {working: true}}))
    expect(first).toHaveBeenCalledWith(expect.objectContaining({error: false, working: true}))
    expect(second).not.toHaveBeenCalled()
    stopFirst()
    globalThis.dispatchEvent(new CustomEvent('poffo-agent-state:one', {detail: {error: true}}))
    expect(first).toHaveBeenCalledOnce()
  } finally {
    stopFirst()
    stopSecond()
  }
})
it('should publish the foremost session and clear it when a character conversation is selected', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  await selectAgentSession('visible-chat')
  await selectAgentSession(null)
  expect(invoke).toHaveBeenNthCalledWith(1, 'select_poffo_speech', {sessionId: 'visible-chat'})
  expect(invoke).toHaveBeenNthCalledWith(2, 'select_poffo_speech', {sessionId: null})
})
