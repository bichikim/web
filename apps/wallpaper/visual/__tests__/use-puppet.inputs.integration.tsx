import {createPlaybackMeter} from '../../src/features/voice/create-playback-meter'
import {synthesizeVowel} from '../../../../packages/puppet/src/player/voice/__tests__/support/synthesize-vowel'
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import * as playerModule from '@winter-love/puppet/player'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {usePuppet} from '../../src/features/background/use-puppet'
import {createLipSyncPublisher} from '../../src/features/lipsync'
import {builtinConnectionProfile} from '../../src/features/connection-profiles/builtin-profile'
import {sendSemanticFrame} from '../../src/features/semantics/channel'
import 'virtual:uno.css'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const player = await importOriginal<typeof playerModule>()
  return {...player, createPlayer: vi.fn(player.createPlayer)}
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should retain a vowel pose, gaze and state inputs together without replacing the animated player', async () => {
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
  setLipsync({shapes: {a: {parameterId: 'angle-y'}}, source: 'voice'})
  const publish = createLipSyncPublisher('combined-widget')
  publish('voice', 0.8, 'a')
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

test('should apply vowel poses and semantic expressions to the bundled Ash player', async () => {
  const blob = await fetch(ashUrl).then((response) => response.blob())
  const rendered = Promise.withResolvers<void>()
  const errors = vi.fn((cause: unknown) => rendered.reject(cause))
  render(() => {
    const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
    usePuppet({
      assetId: () => 'builtin:ash',
      canvas,
      lipsync: () => ({source: 'voice'}),
      lipsyncId: () => 'ash-widget',
      load: async () => blob,
      semanticBindings: () => builtinConnectionProfile('builtin:ash')?.connections.semanticBindings,
      onAfterRender: () => rendered.resolve(),
      onError: errors,
      tracking: () => 'off',
    })
    return (
      <div class="h-80 w-60">
        <canvas ref={setCanvas} class="h-full w-full" />
      </div>
    )
  })
  await rendered.promise
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
  const model = vi.mocked(playerModule.createPlayer).mock.calls[0]![0].document
  const parameters = model.parameters ?? []
  expect(parameters).toHaveLength(265)
  expect(new Set(parameters.map((parameter) => parameter.name)).size).toBe(parameters.length)
  for (const parameter of parameters) {
    expect(parameter.name).toMatch(/^[A-Za-z][\x20-\x7e]*$/u)
  }
  for (const group of model.parameterGroups ?? []) {
    expect(group.name).toMatch(/^[A-Za-z][\x20-\x7e]*$/u)
  }
  expect(parameters.find((parameter) => parameter.id === 'ParamMouthOpenY')?.name).toBe(
    'Mouth Open',
  )
  expect(parameters.find((parameter) => parameter.id === 'ParamMouthForm')?.name).toBe('Mouth Form')
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  await sendSemanticFrame({
    scores: {
      'ash:joy-left': 0.85,
      'ash:joy-open-left': 0.85,
      'ash:joy-open-right': 0.85,
      'ash:joy-right': 0.85,
    },
    widgetId: 'ash-widget',
  })
  await expect
    .poll(() => [
      player.getParameterValue('ParamEyeLSmile'),
      player.getParameterValue('ParamEyeRSmile'),
      player.getParameterValue('ParamEyeLOpen'),
      player.getParameterValue('ParamEyeROpen'),
    ])
    .toEqual([1, 1, 0.25, 0.25])
  await sendSemanticFrame({scores: {'ash:excited': 1}, widgetId: 'ash-widget'})
  await expect.poll(() => player.getParameterValue('Param71')).toBe(1)
  await expect.poll(() => player.getParameterValue('ParamEyeLSmile')).toBe(0)
  await expect.poll(() => player.getParameterValue('ParamEyeLOpen')).toBe(1)
  await sendSemanticFrame({scores: {}, widgetId: 'ash-widget'})
  await expect.poll(() => player.getParameterValue('Param71')).toBe(0)
  const publish = createLipSyncPublisher('ash-widget')
  for (const pose of [
    {form: 0.2, open: 0.9, shape: 'a'},
    {form: 1, open: 0.55, shape: 'i'},
    {form: -1, open: 0.25, shape: 'u'},
    {form: 0.5, open: 0.65, shape: 'e'},
    {form: -1, open: 0.65, shape: 'o'},
    {form: 0, open: 0, shape: 'closed'},
  ] as const) {
    publish('voice', 1, pose.shape)
    // Each pose must be rendered before the next input replaces it.
    // oxlint-disable-next-line no-await-in-loop
    await expect
      .poll(() => [
        player.getParameterValue('ParamMouthOpenY'),
        player.getParameterValue('ParamMouthForm'),
      ])
      .toEqual([pose.open, pose.form])
  }
  publish('voice', 0.1, 'i')
  await expect.poll(() => player.getParameterValue('ParamMouthOpenY')).toBeCloseTo(0.055)
  expect(player.getParameterValue('ParamMouthForm')).toBeLessThan(0.3)
  let clock = 0
  const meter = createPlaybackMeter({
    clock: () => clock,
    onLevel: () => undefined,
    onShape: (shape, level, weights) => publish('voice', level, shape, weights),
  })
  const vowel = synthesizeVowel([480, 820], {length: 640, rate: 16000})
  const samples = Float32Array.from({length: 16000}, (_, index) => vowel[index % vowel.length]!)
  const stop = meter.track(
    {sampleRate: 16000, samples, text: '이 글은 입모양 판정에 쓰지 않음'},
    0,
    1,
  )
  try {
    clock = 0.1
    await expect.poll(() => player.getParameterValue('ParamMouthForm')).toBeLessThan(-0.3)
    expect(player.getParameterValue('ParamMouthOpenY')).toBeGreaterThan(0.2)
    clock = 1.1
    await expect.poll(() => player.getParameterValue('ParamMouthOpenY')).toBe(0)
  } finally {
    stop()
    meter.dispose()
  }
  publish('voice', 0)
  await expect.poll(() => player.getParameterValue('ParamMouthOpenY')).toBe(0)
  await expect.poll(() => player.getParameterValue('ParamMouthForm')).toBe(0)
  expect(errors).not.toHaveBeenCalled()
}, 30_000)
