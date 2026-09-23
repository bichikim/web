/** @vitest-environment jsdom */
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSoundRuntime} from '../runtime'
import {type SoundLayer, type SoundPlayback, type SoundVoice, useSoundPlayer} from '../index'

interface TestVoice extends SoundVoice {
  readonly finish: () => void
}
const runtime = {
  load: vi.fn<() => Promise<void>>(),
  resume: vi.fn<() => Promise<void>>(),
  time: 0,
  voices: [] as TestVoice[],
}
vi.mock('../runtime', () => ({createSoundRuntime: vi.fn()}))

function createVoice(onEnded: () => void): TestVoice {
  let finished = false
  return {
    configure: vi.fn(),
    dispose: vi.fn(),
    finish: () => {
      finished = true
      onEnded()
    },
    get finished() {
      return finished
    },
    load: vi.fn(() => runtime.load()),
    pause: vi.fn(),
    play: vi.fn((_time: number, resume: boolean) => {
      if (!resume) {
        finished = false
      }
    }),
    stop: vi.fn(() => {
      finished = false
    }),
  }
}
beforeEach(() => {
  runtime.voices = []
  runtime.time = 0
  runtime.load.mockResolvedValue(undefined)
  runtime.resume.mockResolvedValue(undefined)
  vi.mocked(createSoundRuntime).mockResolvedValue({
    createVoice: ({onEnded}) => {
      const voice = createVoice(onEnded)
      runtime.voices.push(voice)
      return voice
    },
    now: () => runtime.time,
    resume: runtime.resume,
  })
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
function mount(initial: readonly SoundLayer[]) {
  const [layers, setLayers] = createSignal(initial)
  let player: SoundPlayback | undefined
  const view = render(() => {
    player = useSoundPlayer({layers})
    return null
  })
  if (player === undefined) {
    throw new Error('Missing player')
  }
  return {player, setLayers, unmount: view.unmount}
}
it('should coordinate simultaneous playback, pause, resume, and stop using one runtime clock', async () => {
  const {player} = mount([
    {id: 'rain', source: '/rain.wav'},
    {id: 'wind', source: '/wind.wav'},
  ])
  await player.play()
  expect(runtime.voices).toHaveLength(2)
  expect(runtime.voices[0].play).toHaveBeenLastCalledWith(0, false)
  expect(runtime.voices[1].play).toHaveBeenLastCalledWith(0, false)
  runtime.time = 13
  player.pause()
  expect(player.status()).toBe('paused')
  expect(runtime.voices[0].pause).toHaveBeenLastCalledWith(13)
  await player.play()
  expect(runtime.voices[0].play).toHaveBeenLastCalledWith(13, true)
  player.stop()
  expect(runtime.voices[0].stop).toHaveBeenCalledOnce()
  await player.play()
  expect(runtime.voices[0].play).toHaveBeenLastCalledWith(13, false)
  expect(createSoundRuntime).toHaveBeenCalledOnce()
})
it('should configure changed layers without reloading them', async () => {
  const {player, setLayers} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  setLayers([
    {enabled: false, id: 'rain', loop: false, overlapSeconds: 0, source: '/rain.wav', volume: 0.3},
  ])
  expect(runtime.voices[0].configure).toHaveBeenLastCalledWith({
    enabled: false,
    loop: false,
    overlapSeconds: 0,
    volume: 0.3,
  })
  expect(runtime.load).toHaveBeenCalledOnce()
})
it('should not start playback after stopping during loading', async () => {
  let finish: (() => void) | undefined
  runtime.load.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {player} = mount([{id: 'rain', source: '/rain.wav'}])
  const pending = player.play()
  await waitFor(() => expect(runtime.load).toHaveBeenCalledOnce())
  player.stop()
  finish?.()
  await pending
  expect(player.status()).toBe('idle')
  expect(runtime.voices[0].play).not.toHaveBeenCalled()
  expect(runtime.voices[0].dispose).toHaveBeenCalledOnce()
})
it('should invalidate a pending playback when reactive configuration fails', async () => {
  let finish: (() => void) | undefined
  runtime.load.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {player, setLayers} = mount([{id: 'rain', source: '/rain.wav'}])
  const pending = player.play()
  await waitFor(() => expect(runtime.load).toHaveBeenCalledOnce())
  setLayers([{id: 'rain', source: '/rain.wav', volume: 2}])
  expect(player.status()).toBe('error')
  setLayers([{id: 'rain', source: '/rain.wav', volume: 0.5}])
  finish?.()
  await pending
  expect(player.status()).toBe('error')
  expect(runtime.voices[0].play).not.toHaveBeenCalled()
})
it('should report a load failure and allow retry', async () => {
  runtime.load.mockRejectedValueOnce(new Error('Load failed'))
  const {player} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  expect(player.status()).toBe('error')
  expect(player.error()).toBe('Load failed')
  expect(runtime.voices[0].dispose).toHaveBeenCalledOnce()
  await player.play()
  expect(player.status()).toBe('playing')
})
it('should become idle only after every voice finishes', async () => {
  const {player} = mount([
    {id: 'rain', loop: false, source: '/rain.wav'},
    {id: 'wind', loop: false, source: '/wind.wav'},
  ])
  await player.play()
  runtime.voices[0].finish()
  expect(player.status()).toBe('playing')
  runtime.voices[1].finish()
  expect(player.status()).toBe('idle')
})
it('should release replaced sources and dispose voices with the owner', async () => {
  const {player, setLayers, unmount} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  const first = runtime.voices[0]
  setLayers([{id: 'rain', source: '/other.wav'}])
  expect(first.dispose).toHaveBeenCalledOnce()
  await player.play()
  first.finish()
  expect(player.status()).toBe('playing')
  expect(runtime.voices[1].load).toHaveBeenCalledWith('/other.wav')
  unmount()
  expect(runtime.voices[1].dispose).toHaveBeenCalledOnce()
})
it('should reject duplicate identities before creating a runtime', async () => {
  const {player} = mount([
    {id: 'rain', source: '/one.wav'},
    {id: 'rain', source: '/two.wav'},
  ])
  await player.play()
  expect(player.status()).toBe('error')
  expect(createSoundRuntime).not.toHaveBeenCalled()
})
it('should not create voices when stopped while the audio runtime is resuming', async () => {
  let finish: (() => void) | undefined
  runtime.resume.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {player} = mount([{id: 'rain', source: '/rain.wav'}])
  const pending = player.play()
  await waitFor(() => expect(runtime.resume).toHaveBeenCalledOnce())
  player.stop()
  finish?.()
  await pending
  expect(runtime.voices).toHaveLength(0)
  expect(player.status()).toBe('idle')
})

it('should report runtime activation failure and allow a retry without loading voices early', async () => {
  runtime.resume.mockRejectedValueOnce(new Error('Activation blocked'))
  const {player} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  expect(player.error()).toBe('Activation blocked')
  expect(player.status()).toBe('error')
  expect(runtime.voices).toHaveLength(0)
  await player.play()
  expect(player.status()).toBe('playing')
})

it('should ignore a runtime factory completion after disposal', async () => {
  const available = await createSoundRuntime()
  let finish: ((value: typeof available) => void) | undefined
  vi.mocked(createSoundRuntime).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const {player, unmount} = mount([{id: 'rain', source: '/rain.wav'}])
  const pending = player.play()
  unmount()
  finish?.(available)
  await pending
  expect(runtime.resume).not.toHaveBeenCalled()
  expect(runtime.voices).toHaveLength(0)
})
