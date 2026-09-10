/** @vitest-environment jsdom */
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {installAudioBuffer} from './buffer'
import {type SoundLayer, useSoundPlayer} from '../index'

interface MockPlayer {
  buffer: {duration: number; get: () => AudioBuffer; set: (buffer: AudioBuffer) => void}
  loopStart: number
  loopEnd: number
  loop: boolean
  state: 'started' | 'stopped'
  mute: boolean
  volume: {rampTo: ReturnType<typeof vi.fn>}
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  onstop: () => void
}
const runtime = vi.hoisted(() => ({
  load: vi.fn(),
  players: [] as MockPlayer[],
  start: vi.fn(),
  time: 0,
}))
vi.mock('tone', () => ({
  gainToDb: (gain: number) => (gain === 0 ? -Infinity : 20 * Math.log10(gain)),
  now: () => runtime.time,
  Player: class {
    buffer = {
      duration: 10,
      get: () => new AudioBuffer({length: 100, numberOfChannels: 1, sampleRate: 10}),
      set: vi.fn(),
    }
    loopStart = 0
    loopEnd = 10
    now = () => runtime.time
    loop = true
    state: 'started' | 'stopped' = 'stopped'
    mute = false
    volume = {rampTo: vi.fn()}
    start = vi.fn()
    stop = vi.fn()
    dispose = vi.fn()
    onstop = () => {}
    constructor() {
      runtime.players.push(this)
    }
    toDestination() {
      return this
    }
    load(source: string) {
      return runtime.load(source)
    }
  },
  start: runtime.start,
}))
beforeEach(() => {
  installAudioBuffer()
  runtime.players = []
  runtime.time = 0
  runtime.load.mockResolvedValue(undefined)
  runtime.start.mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
const mount = (initial: readonly SoundLayer[]) => {
  const [layers, setLayers] = createSignal(initial)
  let player: ReturnType<typeof useSoundPlayer> | undefined
  const view = render(() => {
    player = useSoundPlayer({layers})
    return null
  })
  if (!player) {
    throw new Error('Missing player')
  }
  return {player, setLayers, unmount: view.unmount}
}
it('should mix loops, resume their position and reset on stop', async () => {
  const {player} = mount([
    {id: 'rain', source: '/rain.wav'},
    {id: 'wind', source: '/wind.wav'},
  ])
  await player.play()
  expect(runtime.players).toHaveLength(2)
  expect(player.status()).toBe('playing')
  runtime.time = 13
  player.pause()
  expect(player.status()).toBe('paused')
  await player.play()
  expect(runtime.players[0].start).toHaveBeenLastCalledWith(13, 7)
  expect(runtime.players[0].loopStart).toBe(4)
  player.stop()
  await player.play()
  expect(runtime.players[0].start).toHaveBeenLastCalledWith(13, 0)
})
it('should apply reactive volume and loop settings without reloading sources', async () => {
  const {player, setLayers, unmount} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  setLayers([{enabled: false, id: 'rain', loop: false, source: '/rain.wav', volume: 0.5}])
  expect(runtime.players[0].mute).toBe(true)
  expect(runtime.players[0].loop).toBe(false)
  expect(runtime.players[0].volume.rampTo).toHaveBeenLastCalledWith(20 * Math.log10(0.5), 0.05)
  expect(runtime.load).toHaveBeenCalledOnce()
  unmount()
  expect(runtime.players[0].dispose).toHaveBeenCalledOnce()
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
  expect(runtime.players[0].start).not.toHaveBeenCalled()
  expect(runtime.players[0].dispose).toHaveBeenCalledOnce()
})
it('should not finish a pending playback after an invalid reactive setting releases its voices', async () => {
  let finish: (() => void) | undefined
  runtime.load.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {player, setLayers} = mount([{id: 'rain', source: '/rain.wav', volume: 0.5}])
  const pending = player.play()
  await waitFor(() => expect(runtime.load).toHaveBeenCalledOnce())

  setLayers([{id: 'rain', source: '/rain.wav', volume: 2}])
  expect(player.status()).toBe('error')
  setLayers([{id: 'rain', source: '/rain.wav', volume: 0.5}])
  finish?.()
  await pending

  expect(player.status()).toBe('error')
  expect(runtime.players[0].start).not.toHaveBeenCalled()
})
it('should report load failure and permit a retry', async () => {
  runtime.load.mockRejectedValueOnce(new Error('Load failed'))
  const {player} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  expect(player.status()).toBe('error')
  expect(player.error()).toBe('Load failed')
  await player.play()
  expect(player.status()).toBe('playing')
})

it('should finish non-looping sounds and avoid restarting a finished layer on resume', async () => {
  const {player} = mount([
    {id: 'once', loop: false, source: '/once.wav'},
    {id: 'rain', source: '/rain.wav'},
  ])
  await player.play()
  runtime.players[0].state = 'started'
  runtime.players[0].onstop()
  runtime.players[0].state = 'stopped'
  await Promise.resolve()
  player.pause()
  await player.play()
  expect(runtime.players[0].start).toHaveBeenCalledOnce()
  expect(runtime.players[1].start).toHaveBeenCalledTimes(2)
})
it('should become idle when Tone updates a non-looping source state after reporting it stopped', async () => {
  const {player} = mount([{id: 'once', loop: false, source: '/once.wav'}])
  await player.play()

  runtime.players[0].state = 'started'
  runtime.players[0].onstop()
  runtime.players[0].state = 'stopped'

  await waitFor(() => expect(player.status()).toBe('idle'))
})
it('should not finish a non-looping source restarted by a reactive configuration change', async () => {
  const {player, setLayers} = mount([
    {id: 'once', loop: true, overlapSeconds: 2, source: '/once.wav'},
  ])
  await player.play()

  runtime.players[0].state = 'started'
  setLayers([{id: 'once', loop: false, overlapSeconds: 0, source: '/once.wav'}])
  runtime.players[0].onstop()

  await Promise.resolve()
  expect(player.status()).toBe('playing')
})
it('should release sources when the input changes and on disposal', async () => {
  const {player, setLayers, unmount} = mount([{id: 'rain', source: '/rain.wav'}])
  await player.play()
  const first = runtime.players[0]
  setLayers([{id: 'rain', source: '/other.wav'}])
  expect(player.status()).toBe('idle')
  expect(first.dispose).toHaveBeenCalledOnce()
  await player.play()
  expect(runtime.load).toHaveBeenLastCalledWith('/other.wav')
  unmount()
  expect(runtime.players[1].dispose).toHaveBeenCalledOnce()
})
it('should reject duplicate identities before loading audio', async () => {
  const {player} = mount([
    {id: 'rain', source: '/one.wav'},
    {id: 'rain', source: '/two.wav'},
  ])
  await player.play()
  expect(player.status()).toBe('error')
  expect(runtime.load).not.toHaveBeenCalled()
})

it('should update overlap settings without loading the source again', async () => {
  const {player, setLayers} = mount([{id: 'rain', overlapSeconds: 2, source: '/rain.wav'}])
  await player.play()
  expect(runtime.players[0].loopStart).toBe(2)
  setLayers([{id: 'rain', overlapSeconds: 0, source: '/rain.wav'}])
  expect(runtime.players[0].loopStart).toBe(0)
  expect(runtime.load).toHaveBeenCalledOnce()
})
