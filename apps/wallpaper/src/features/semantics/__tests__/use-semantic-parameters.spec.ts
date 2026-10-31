/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
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
  const player = {clearParameterValues: vi.fn(), patchParameterValues: vi.fn()}
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
    expect(player.patchParameterValues).toHaveBeenLastCalledWith({angle: 0})
    setBindings((value) => value.map((item) => ({...item, enabled: false})))
    expect(player.clearParameterValues).toHaveBeenCalledWith(['angle'])
    await sendSemanticFrame({scores: {happy: 1}, widgetId: 'another-widget'})
    expect(player.patchParameterValues).toHaveBeenCalledTimes(1)
  } finally {
    dispose()
  }
})
