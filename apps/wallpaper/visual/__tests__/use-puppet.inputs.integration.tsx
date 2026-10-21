import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {usePuppet} from '../../src/features/background/use-puppet'
import {createLipSyncPublisher} from '../../src/features/lipsync'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', {spy: true})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should retain lip opening, gaze and state inputs together without replacing the animated player', async () => {
  const document = playerModule.createDemoDocument()
  const source = JSON.stringify({
    ...document,
    parameters: [
      ...document.parameters!,
      {defaultValue: 0, id: 'waiting', maximum: 1, minimum: 0, name: 'Waiting'},
    ],
  })
  const [lipsync, setLipsync] = createSignal<PoffoLipSync>({source: 'off'})
  const errors = vi.fn()
  render(() => {
    const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
    usePuppet({
      agentBindings: () => ({working: {parameterId: 'waiting'}}),
      assetId: () => 'combined-inputs',
      canvas,
      lipsync,
      lipsyncId: () => 'combined-widget',
      load: async () => source,
      onError: errors,
      tracking: () => 'cursor',
      trackingBindings: () => ({headY: {parameterId: null}}),
    })
    return (
      <div class="h-60 w-80">
        <canvas ref={setCanvas} class="h-full w-full" />
      </div>
    )
  })
  await expect.poll(() => vi.mocked(playerModule.createPlayer).mock.results.length).toBe(1)
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  globalThis.dispatchEvent(new CustomEvent('poffo-agent-state', {detail: {working: true}}))
  await expect.poll(() => player.getParameterValue('waiting')).toBe(1)
  setLipsync({parameterId: 'angle-y', source: 'voice'})
  const publish = createLipSyncPublisher('combined-widget')
  publish('voice', 0.8)
  await expect.poll(() => player.getParameterValue('angle-y')).toBeCloseTo(24)
  expect(player.getParameterValue('waiting')).toBe(1)
  globalThis.dispatchEvent(new PointerEvent('pointermove', {clientX: 800, clientY: 100}))
  await expect.poll(() => player.getParameterValue('angle-x')).toBeGreaterThan(1)
  expect(player.getParameterValue('angle-y')).toBeCloseTo(24)
  expect(player.getParameterValue('waiting')).toBe(1)
  globalThis.dispatchEvent(new CustomEvent('poffo-agent-state', {detail: {}}))
  await expect.poll(() => player.getParameterValue('waiting')).toBe(0)
  expect(player.getParameterValue('angle-y')).toBeCloseTo(24)
  publish('voice', 0)
  await expect.poll(() => player.getParameterValue('angle-y')).toBe(0)
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
  expect(errors).not.toHaveBeenCalled()
})
