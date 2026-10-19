/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {Player} from '@winter-love/puppet/player'
import type {AgentSignals, AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import {readAgentSignals, subscribeAgentSignals} from '../native'
import {useAgentState} from '../use-agent-state'

vi.mock('../native', () => ({readAgentSignals: vi.fn(), subscribeAgentSignals: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
it('should follow live state over a late initial read and release only the mapped parameter on unbind', async () => {
  const initial = Promise.withResolvers<AgentSignals>()
  vi.mocked(readAgentSignals).mockReturnValue(initial.promise)
  let receive: (signals: AgentSignals) => void = () => undefined
  const stop = vi.fn()
  vi.mocked(subscribeAgentSignals).mockImplementation(async (callback) => {
    receive = callback
    return stop
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  const [bindings, setBindings] = createSignal<AgentStateBindings>({
    approval: {parameterId: 'waiting'},
  })
  renderHook(() =>
    useAgentState({
      bindings,
      parameters: () => [{defaultValue: 0, id: 'waiting', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
    }),
  )
  await Promise.resolve()
  receive({approval: true})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({waiting: 1})
  initial.resolve({approval: false})
  await initial.promise
  await Promise.resolve()
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({waiting: 1})
  setBindings({...bindings()})
  expect(stop).not.toHaveBeenCalled()
  receive({})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({waiting: 0})
  setBindings({})
  expect(player.clearParameterValues).toHaveBeenLastCalledWith(['waiting'])
  expect(stop).toHaveBeenCalledOnce()
})
