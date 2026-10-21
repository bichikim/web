import {describe, expect, test, vi} from 'vitest'

import type {PuppetMotion} from '../../document'
import type {MotionFrame} from '../../playback/types'
import type {PuppetSound} from '../decode-wav'
import {createMotionSoundOutput} from '../motion-sound-output'

/** An AudioContext stand-in whose clock the test moves. */
const createContext = () => {
  const sources: Array<{offset: number; rate: number; stopped: boolean}> = []
  const gains: Array<{gain: {value: number}}> = []
  const context = {
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      channels,
      copyToChannel: vi.fn(),
      length,
      sampleRate,
    })),
    createBufferSource: () => {
      const record = {offset: Number.NaN, rate: 1, stopped: false}
      sources.push(record)
      return {
        buffer: null,
        connect: vi.fn(),
        playbackRate: {
          get value() {
            return record.rate
          },
          set value(value: number) {
            record.rate = value
          },
        },
        start: (_when: number, offset: number) => {
          record.offset = offset
        },
        stop: () => {
          record.stopped = true
        },
      }
    },
    createGain: () => {
      const gain = {connect: vi.fn(), disconnect: vi.fn(), gain: {value: 1}}
      gains.push(gain)
      return gain
    },
    currentTime: 0,
    state: 'running' as AudioContextState,
  }
  return {context, gains, sources}
}

const sound: PuppetSound = {
  channels: [new Float32Array(16_000)],
  mono: new Float32Array(16_000),
  sampleRate: 8000,
}
const motion: PuppetMotion = {duration: 4, id: 'talk', sound: {src: 'talk.wav'}, tracks: []}
const frame = (time: number, rate = 1, weight = 1): MotionFrame => ({
  blend: 'replace',
  motion,
  priority: 0,
  rate,
  time,
  weight,
})
const getSound = () => sound

describe('createMotionSoundOutput', () => {
  test('should play in step with the motion and restart after seeks and speed changes', () => {
    const {context, gains, sources} = createContext()
    const output = createMotionSoundOutput({context} as unknown as AudioNode)
    output.sync([frame(0.2, 1, 0.5)], getSound)
    expect(sources).toEqual([{offset: 0.2, rate: 1, stopped: false}])
    expect(gains[0]!.gain.value).toBe(0.5)
    expect(context.createBuffer).toHaveBeenCalledWith(1, 16_000, 8000)
    // Following along within the drift allowance keeps the voice.
    context.currentTime = 1
    output.sync([frame(1.25)], getSound)
    expect(sources).toHaveLength(1)
    // A seek (or loop) restarts at the motion time; so does a speed change.
    output.sync([frame(0.1)], getSound)
    output.sync([frame(0.1, 2)], getSound)
    expect(sources.map(({offset, rate, stopped}) => [offset, rate, stopped])).toEqual([
      [0.2, 1, true],
      [0.1, 1, true],
      [0.1, 2, false],
    ])
    // The buffer is made once per sound.
    expect(context.createBuffer).toHaveBeenCalledTimes(1)
  })

  test('should not restart for drift while the context is suspended', () => {
    const {context, sources} = createContext()
    context.state = 'suspended'
    const output = createMotionSoundOutput({context} as unknown as AudioNode)
    // A missing voice still starts so it plays once the context resumes.
    output.sync([frame(0.2)], getSound)
    // The frozen clock looks like drift, but the voice is kept.
    output.sync([frame(1)], getSound)
    output.sync([frame(1.5)], getSound)
    expect(sources).toEqual([{offset: 0.2, rate: 1, stopped: false}])
    // Once running, the real drift restarts the voice at the motion time.
    context.state = 'running'
    output.sync([frame(1.6)], getSound)
    expect(sources.map(({offset, stopped}) => [offset, stopped])).toEqual([
      [0.2, true],
      [1.6, false],
    ])
  })

  test('should skip and report a sound the context refuses instead of throwing', () => {
    const {context, gains, sources} = createContext()
    context.createBuffer.mockImplementation(() => {
      throw new DOMException('rate out of range', 'NotSupportedError')
    })
    const onError = vi.fn()
    const output = createMotionSoundOutput({context} as unknown as AudioNode, onError)
    expect(() => output.sync([frame(0.5)], getSound)).not.toThrow()
    output.sync([frame(0.6)], getSound)
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith('talk.wav')
    // Nothing was connected for the refused sound.
    expect([gains.length, sources.length]).toEqual([0, 0])
  })

  test('should stop when paused, past the sound or no longer playing', () => {
    const {context, sources} = createContext()
    const output = createMotionSoundOutput({context} as unknown as AudioNode)
    output.sync([frame(0.5)], getSound)
    output.sync([frame(0.5, 0)], getSound)
    output.sync([frame(0.5)], getSound)
    output.sync([frame(2.5)], getSound)
    output.sync([frame(0.5)], getSound)
    output.sync([], getSound)
    output.sync([frame(0.5), frame(1)], getSound)
    output.stop()
    expect(sources.map(({offset, stopped}) => [offset, stopped])).toEqual([
      [0.5, true],
      [0.5, true],
      [0.5, true],
      // Two playbacks of one motion each get a voice.
      [0.5, true],
      [1, true],
    ])
  })
})
