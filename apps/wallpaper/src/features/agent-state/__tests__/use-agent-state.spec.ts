/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {Player} from '@winter-love/puppet/player'
import type {AgentSignals, AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import {readAgentSignals, subscribeAgentSignals} from '../native'
import {useAgentState} from '../use-agent-state'
import {sendSemanticFrame} from '../../semantics/channel'

vi.mock('../native', () => ({readAgentSignals: vi.fn(), subscribeAgentSignals: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should preview one state over live status and response content, then restore the latest status', async () => {
  vi.mocked(readAgentSignals).mockResolvedValue({})
  let receive: (signals: AgentSignals) => void = () => undefined
  vi.mocked(subscribeAgentSignals).mockImplementation(async (callback) => {
    receive = callback
    return vi.fn<() => void>()
  })
  const player = {
    clearParameterValues: vi.fn(),
    patchParameterValues: vi.fn(),
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn(),
    startMotion: vi.fn(),
  }
  const actions = ['notes', 'thumbs', 'error'].map((id) => ({
    action: {id, kind: 'expression' as const},
    label: id,
    parameterIds: [id],
  }))
  const hook = renderHook(() =>
    useAgentState({
      actions: () => actions,
      bindings: () => ({
        error: {actions: [actions[2].action], parameterId: null},
        response: {actions: [actions[1].action], parameterId: null},
        working: {actions: [actions[0].action], parameterId: null},
      }),
      contentEnabled: () => true,
      parameters: () => [],
      player: () => player as unknown as Player,
      widgetId: () => 'preview-widget',
    }),
  )
  await Promise.resolve()
  receive({error: true, response: true})
  await sendSemanticFrame({agentPreview: 'response', scores: {}, widgetId: 'preview-widget'})
  expect([...hook.result.reservedParameters()]).toEqual(['thumbs'])
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith(expect.any(String), 'thumbs')
  receive({working: true})
  await sendSemanticFrame({agentPreview: 'error', scores: {}, widgetId: 'other-widget'})
  expect([...hook.result.reservedParameters()]).toEqual(['thumbs'])
  await sendSemanticFrame({scores: {}, widgetId: 'preview-widget'})
  expect([...hook.result.reservedParameters()]).toEqual(['notes'])
  receive({response: true})
  expect([...hook.result.reservedParameters()]).toEqual([])
})

it('should preview the current numeric binding and release it back to the latest real state', async () => {
  vi.mocked(readAgentSignals).mockResolvedValue({})
  let receive: (signals: AgentSignals) => void = () => undefined
  vi.mocked(subscribeAgentSignals).mockImplementation(async (callback) => {
    receive = callback
    return vi.fn<() => void>()
  })
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
  const [bindings, setBindings] = createSignal<AgentStateBindings>({
    approval: {on: 0.8, parameterId: 'pose'},
    working: {on: 0.4, parameterId: 'pose'},
  })
  const hook = renderHook(() =>
    useAgentState({
      bindings,
      parameters: () => [{defaultValue: 0, id: 'pose', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
      widgetId: () => 'parameter-preview',
    }),
  )
  await Promise.resolve()
  receive({approval: true})
  await sendSemanticFrame({agentPreview: 'working', scores: {}, widgetId: 'parameter-preview'})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({pose: 0.4})
  expect([...hook.result.reservedParameters()]).toEqual(['pose'])
  setBindings({...bindings(), working: {on: 0.6, parameterId: 'pose'}})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({pose: 0.6})
  await sendSemanticFrame({scores: {}, widgetId: 'parameter-preview'})
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({pose: 0.8})
  expect([...hook.result.reservedParameters()]).toEqual([])
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

it('should hold complete state actions, replace them by priority, and release only its own layers', async () => {
  vi.mocked(readAgentSignals).mockResolvedValue({})
  let receive: (signals: AgentSignals) => void = () => undefined
  vi.mocked(subscribeAgentSignals).mockImplementation(async (callback) => {
    receive = callback
    return vi.fn<() => void>()
  })
  const player = {
    clearParameterValues: vi.fn(),
    patchParameterValues: vi.fn(),
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn(),
    startMotion: vi.fn(),
  }
  const actions = ['노트 들기', '필기 동작', '긴장'].map((id) => ({
    action: {id, kind: 'expression' as const},
    label: id,
    parameterIds: [id],
  }))
  const hook = renderHook(() =>
    useAgentState({
      actions: () => actions,
      bindings: () => ({
        approval: {actions: [actions[2].action], parameterId: null},
        working: {actions: [actions[0].action, actions[1].action], parameterId: null},
      }),
      parameters: () => [],
      player: () => player as unknown as Player,
    }),
  )
  await Promise.resolve()
  receive({working: true})
  expect(player.setExpressionLayer).toHaveBeenCalledWith(expect.any(String), '노트 들기')
  expect(player.setExpressionLayer).toHaveBeenCalledWith(expect.any(String), '필기 동작')
  expect([...hook.result.reservedParameters()]).toEqual(['노트 들기', '필기 동작'])
  const owned = player.setExpressionLayer.mock.calls.map(([layer]) => layer)
  receive({approval: true, working: true})
  owned.forEach((layer) => expect(player.setExpressionLayer).toHaveBeenCalledWith(layer))
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith(expect.any(String), '긴장')
  receive({})
  expect([...hook.result.reservedParameters()]).toEqual([])
  expect(player.clearParameterValues).not.toHaveBeenCalled()
})

it('should yield response actions and overrides to content and restore working behavior', async () => {
  vi.mocked(readAgentSignals).mockResolvedValue({})
  let receive: (signals: AgentSignals) => void = () => undefined
  vi.mocked(subscribeAgentSignals).mockImplementation(async (callback) => {
    receive = callback
    return vi.fn<() => void>()
  })
  const player = {
    clearParameterValues: vi.fn(),
    patchParameterValues: vi.fn(),
    resetMotionHistory: vi.fn(),
    setExpressionLayer: vi.fn(),
    startMotion: vi.fn(),
  }
  const actions = ['notes', 'writing', 'thumbs'].map((id) => ({
    action: {id, kind: 'expression' as const},
    label: id,
    parameterIds: [id],
  }))
  const [contentEnabled, setContentEnabled] = createSignal(true)
  const hook = renderHook(() =>
    useAgentState({
      actions: () => actions,
      bindings: () => ({
        response: {actions: [actions[2].action], parameterId: 'hand'},
        working: {actions: [actions[0].action, actions[1].action], parameterId: 'hand'},
      }),
      contentEnabled,
      parameters: () => [{defaultValue: 0, id: 'hand', maximum: 1, minimum: 0}],
      player: () => player as unknown as Player,
    }),
  )
  await Promise.resolve()
  receive({working: true})
  expect([...hook.result.reservedParameters()]).toEqual(['notes', 'writing'])
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({hand: 1})
  const layers = player.setExpressionLayer.mock.calls.map(([layer]) => layer)
  player.setExpressionLayer.mockClear()
  player.patchParameterValues.mockClear()
  receive({connected: true, response: true})
  expect([...hook.result.reservedParameters()]).toEqual([])
  layers.forEach((layer) => expect(player.setExpressionLayer).toHaveBeenCalledWith(layer))
  expect(player.setExpressionLayer).not.toHaveBeenCalledWith(expect.any(String), 'thumbs')
  expect(player.clearParameterValues).toHaveBeenLastCalledWith(['hand'])
  expect(player.patchParameterValues).not.toHaveBeenCalled()
  setContentEnabled(false)
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith(expect.any(String), 'thumbs')
  expect(player.patchParameterValues).toHaveBeenLastCalledWith({hand: 1})
  setContentEnabled(true)
  expect([...hook.result.reservedParameters()]).toEqual([])
  receive({working: true})
  expect([...hook.result.reservedParameters()]).toEqual(['notes', 'writing'])
  expect(player.setExpressionLayer).toHaveBeenLastCalledWith(expect.any(String), 'writing')
})
