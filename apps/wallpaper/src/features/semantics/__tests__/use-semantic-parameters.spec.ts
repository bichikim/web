/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {createStore} from 'solid-js/store'
import {expect, it, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {sendSemanticFrame} from '../channel'
import {useSemanticParameters} from '../use-semantic-parameters'

it('should apply analyzed scores to a player and release the override when its rule is disabled', async () => {
  const [bindings, setBindings] = createSignal<readonly SemanticBinding[]>([
    {
      enabled: true,
      from: -30,
      id: 'happy',
      mode: 'range',
      parameterId: 'angle',
      text: '기쁨',
      threshold: 0.5,
      to: 30,
    },
  ])
  const player = {patchParameterBlends: vi.fn()}
  const dispose = createRoot((cleanup) => {
    useSemanticParameters({
      bindings,
      parameters: () => [{defaultValue: 0, id: 'angle', maximum: 30, minimum: -30}],
      player: () => player,
      widgetId: () => 'widget',
    })
    return cleanup
  })
  try {
    await sendSemanticFrame({scores: {happy: 0.75}, widgetId: 'widget'})
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {
        angle: {mode: 'overwrite', value: 0},
      },
      'after-physics',
    )
    setBindings((value) => value.map((item) => ({...item, enabled: false})))
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {angle: undefined},
      'after-physics',
    )
    await sendSemanticFrame({scores: {happy: 1}, widgetId: 'another-widget'})
    expect(player.patchParameterBlends).toHaveBeenCalledTimes(2)
  } finally {
    dispose()
  }
})
it('should animate, retain phase on repeated scores, apply edits and release on speech end', async () => {
  const frames = new Map<number, FrameRequestCallback>()
  let next = 0
  const request = vi.fn((callback: FrameRequestCallback) => {
    next += 1
    frames.set(next, callback)
    return next
  })
  const cancel = vi.fn((id: number) => frames.delete(id))
  vi.stubGlobal('requestAnimationFrame', request)
  vi.stubGlobal('cancelAnimationFrame', cancel)
  const player = {patchParameterBlends: vi.fn()}
  const [bindings, setBindings] = createStore([
    {
      animation: {period: 1},
      enabled: true,
      from: 0,
      id: 'nod',
      mode: 'toggle' as const,
      parameterId: 'angle',
      releaseWhenUnmatched: true,
      text: '동의해요',
      threshold: 0.8,
      to: 20,
    },
  ])
  const dispose = createRoot((cleanup) => {
    useSemanticParameters({
      bindings: () => bindings,
      parameters: () => [{defaultValue: 0, id: 'angle', maximum: 30, minimum: -30}],
      player: () => player,
      widgetId: () => 'animated',
    })
    return cleanup
  })
  const tick = (time: number) => {
    const [id, callback] = frames.entries().next().value!
    frames.delete(id)
    callback(time)
  }
  try {
    await sendSemanticFrame({scores: {nod: 1}, widgetId: 'animated'})
    tick(1000)
    tick(1500)
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {
        angle: {mode: 'overwrite', value: 20},
      },
      'after-physics',
    )
    const scheduled = request.mock.calls.length
    await sendSemanticFrame({scores: {nod: 1}, widgetId: 'animated'})
    expect(request).toHaveBeenCalledTimes(scheduled)
    setBindings(0, 'animation', 'period', 2)
    tick(2000)
    tick(2500)
    expect(player.patchParameterBlends.mock.calls.at(-1)?.[0].angle?.value).toBeCloseTo(10)
    await sendSemanticFrame({scores: {}, widgetId: 'animated'})
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {angle: undefined},
      'after-physics',
    )
    expect(frames.size).toBe(0)
  } finally {
    dispose()
    vi.unstubAllGlobals()
  }
})
it('should preview only the requested parameter and restore the latest automatic scores', async () => {
  const player = {patchParameterBlends: vi.fn()}
  const bindings: readonly SemanticBinding[] = ['first', 'second'].map((id) => ({
    enabled: true,
    id,
    mode: 'range',
    parameterId: id,
    text: '같은 행동',
    threshold: 0.5,
    to: 30,
  }))
  const dispose = createRoot((cleanup) => {
    useSemanticParameters({
      bindings: () => bindings,
      parameters: () =>
        bindings.map((item) => ({defaultValue: 0, id: item.id, maximum: 30, minimum: -30})),
      player: () => player,
      widgetId: () => 'manual-widget',
    })
    return cleanup
  })
  try {
    await sendSemanticFrame({
      previewId: 'first',
      scores: {first: 0, second: 1},
      widgetId: 'manual-widget',
    })
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {first: {mode: 'overwrite', value: 30}},
      'after-physics',
    )
    await sendSemanticFrame({previewId: 'second', scores: {}, widgetId: 'manual-widget'})
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {second: {mode: 'overwrite', value: 30}},
      'after-physics',
    )
    await sendSemanticFrame({scores: {second: 0.75}, widgetId: 'manual-widget'})
    expect(player.patchParameterBlends).toHaveBeenLastCalledWith(
      {second: {mode: 'overwrite', value: 15}},
      'after-physics',
    )
  } finally {
    dispose()
  }
})
