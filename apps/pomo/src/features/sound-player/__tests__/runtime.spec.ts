/** @vitest-environment jsdom */
import * as tone from 'tone'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSoundRuntime} from '../runtime'
import type {VoiceSettings} from '../types'
import {installAudioBuffer} from './buffer'

vi.mock('tone', () => ({gainToDb: vi.fn(), now: vi.fn(), Player: vi.fn(), start: vi.fn()}))

let time = 0
const load = vi.fn<() => Promise<void>>()
const players: FixturePlayer[] = []
const settings: VoiceSettings = {enabled: true, loop: true, overlapSeconds: 4, volume: 0.5}

class FixturePlayer {
  private data = new AudioBuffer({length: 100, numberOfChannels: 1, sampleRate: 10})
  readonly buffer = {
    get duration() {
      return 10
    },
    get: vi.fn(() => this.data),
    set: vi.fn((value: AudioBuffer) => {
      this.data = value
    }),
  }
  loop = false
  loopStart = 0
  loopEnd = 0
  mute = false
  state: 'started' | 'stopped' = 'stopped'
  readonly volume = {rampTo: vi.fn()}
  onstop = () => {}
  readonly start = vi.fn((_time: number, _offset: number) => {
    this.state = 'started'
  })
  readonly stop = vi.fn(() => {
    this.end()
  })
  readonly dispose = vi.fn()
  readonly load = vi.fn(() => load())
  now() {
    return time
  }
  toDestination() {
    return this
  }
  end() {
    // Reproduce Tone 15.1.22's callback-before-state-update contract at this adapter boundary.
    this.onstop()
    this.state = 'stopped'
  }
}

beforeEach(() => {
  installAudioBuffer()
  time = 0
  players.length = 0
  load.mockResolvedValue(undefined)
  vi.mocked(tone.Player).mockImplementation(function Player() {
    const player = new FixturePlayer()
    players.push(player)
    return player as unknown as tone.Player
  })
  vi.mocked(tone.start).mockResolvedValue(undefined)
  vi.mocked(tone.now).mockImplementation(() => time)
  vi.mocked(tone.gainToDb).mockImplementation((gain) => 20 * Math.log10(gain))
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

async function createLoadedVoice(options = settings) {
  const runtime = await createSoundRuntime()
  const onEnded = vi.fn()
  const voice = runtime.createVoice({onEnded})
  await voice.load('/rain.wav')
  voice.configure(options)
  return {onEnded, runtime, voice}
}

it('should preserve loop position on pause and resume and reset on stop', async () => {
  const {runtime, voice} = await createLoadedVoice()
  await runtime.resume()
  expect(tone.start).toHaveBeenCalledOnce()
  voice.play(runtime.now(), false)
  time = 13
  voice.pause(runtime.now())
  voice.play(runtime.now(), true)
  expect(players[0].start).toHaveBeenLastCalledWith(13, 7)
  expect(players[0].loopStart).toBe(4)
  voice.stop()
  voice.play(runtime.now(), false)
  expect(players[0].start).toHaveBeenLastCalledWith(13, 0)
  voice.dispose()
})
it('should normalize natural completion after Tone updates its state', async () => {
  const {voice, onEnded} = await createLoadedVoice({...settings, loop: false})
  voice.play(0, false)
  players[0].end()
  expect(onEnded).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(onEnded).toHaveBeenCalledOnce()
  expect(voice.finished).toBe(true)
  voice.play(1, true)
  expect(players[0].start).toHaveBeenCalledOnce()
  voice.play(2, false)
  expect(players[0].start).toHaveBeenLastCalledWith(2, 0)
  expect(voice.finished).toBe(false)
  voice.dispose()
})
it('should ignore stale stop callbacks from reactive loop reconfiguration', async () => {
  const {voice, onEnded} = await createLoadedVoice()
  voice.play(0, false)
  voice.configure({...settings, enabled: false, loop: false, volume: 0.3})
  await Promise.resolve()
  expect(players[0].state).toBe('started')
  expect(players[0].loop).toBe(false)
  expect(players[0].mute).toBe(true)
  expect(players[0].volume.rampTo).toHaveBeenLastCalledWith(20 * Math.log10(0.3), 0.05)
  expect(onEnded).not.toHaveBeenCalled()
  expect(load).toHaveBeenCalledOnce()
  voice.dispose()
})
it('should not emit completion for paused, stopped, or disposed voices', async () => {
  const {voice, onEnded} = await createLoadedVoice({...settings, loop: false})
  voice.play(0, false)
  voice.pause(1)
  await Promise.resolve()
  expect(onEnded).not.toHaveBeenCalled()
  voice.play(2, true)
  voice.stop()
  await Promise.resolve()
  expect(onEnded).not.toHaveBeenCalled()
  voice.play(3, false)
  players[0].end()
  voice.dispose()
  await Promise.resolve()
  expect(onEnded).not.toHaveBeenCalled()
  expect(players[0].dispose).toHaveBeenCalledOnce()
})
it('should avoid reading a disposed buffer when a pending load completes', async () => {
  let finish: (() => void) | undefined
  load.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const runtime = await createSoundRuntime()
  const voice = runtime.createVoice({onEnded: vi.fn()})
  const pending = voice.load('/rain.wav')
  voice.dispose()
  finish?.()
  await pending
  expect(players[0].buffer.get).not.toHaveBeenCalled()
  expect(players[0].dispose).toHaveBeenCalledOnce()
})
it('should update overlap without reloading and reject an invalid overlap', async () => {
  const {voice} = await createLoadedVoice()
  voice.configure({...settings, overlapSeconds: 2})
  expect(players[0].loopStart).toBe(2)
  voice.configure({...settings, overlapSeconds: 0})
  expect(players[0].loopStart).toBe(0)
  expect(() => voice.configure({...settings, overlapSeconds: 6})).toThrow('절반')
  expect(load).toHaveBeenCalledOnce()
  voice.dispose()
})
