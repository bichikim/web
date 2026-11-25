import {afterEach, expect, it, vi} from 'vitest'
import {createMicrophoneMeter} from '../create-microphone-meter'

const microphone = () => {
  let amplitude = 0
  let callback: FrameRequestCallback | undefined
  const analyser = {
    disconnect: vi.fn(),
    fftSize: 1024,
    getFloatTimeDomainData: vi.fn((samples: Float32Array) => samples.fill(amplitude)),
  }
  const input = {connect: vi.fn(), disconnect: vi.fn()}
  const context = {
    close: vi.fn().mockResolvedValue(undefined),
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamSource: vi.fn(() => input),
    resume: vi.fn().mockResolvedValue(undefined),
  }
  vi.stubGlobal(
    'AudioContext',
    class {
      readonly close = context.close
      readonly createAnalyser = context.createAnalyser
      readonly createMediaStreamSource = context.createMediaStreamSource
      readonly resume = context.resume
    },
  )
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((next: FrameRequestCallback) => {
      callback = next
      return 1
    }),
  )
  const cancel = vi.fn()
  vi.stubGlobal('cancelAnimationFrame', cancel)
  return {
    analyser,
    cancel,
    context,
    input,
    sample: (value: number, time: number) => {
      amplitude = value
      const current = callback
      callback = undefined
      current?.(time)
    },
  }
}
afterEach(() => vi.unstubAllGlobals())

it('should react to real PCM levels, stay bounded and fade back to silence', async () => {
  const media = microphone()
  const onLevel = vi.fn()
  const dispose = createMicrophoneMeter({onError: vi.fn(), onLevel, stream: {} as MediaStream})
  await Promise.resolve()
  media.sample(0, 16)
  expect(onLevel).toHaveBeenLastCalledWith(0)
  media.sample(0.02, 48)
  const quiet = onLevel.mock.lastCall![0]
  expect(quiet).toBeGreaterThan(0)
  media.sample(0.2, 80)
  expect(onLevel.mock.lastCall![0]).toBeGreaterThan(quiet)
  media.sample(1, 1000)
  expect(onLevel.mock.lastCall![0]).toBeLessThanOrEqual(1)
  media.sample(0, 3000)
  expect(onLevel).toHaveBeenLastCalledWith(0)
  dispose()
})

it('should release its graph and ignore a queued frame after disposal', async () => {
  const media = microphone()
  const onLevel = vi.fn()
  const dispose = createMicrophoneMeter({onError: vi.fn(), onLevel, stream: {} as MediaStream})
  await Promise.resolve()
  media.sample(0.1, 16)
  dispose()
  dispose()
  const updates = onLevel.mock.calls.length
  media.sample(0.8, 32)
  expect(onLevel).toHaveBeenLastCalledWith(0)
  expect(onLevel).toHaveBeenCalledTimes(updates)
  expect(media.cancel).toHaveBeenCalled()
  expect(media.input.disconnect).toHaveBeenCalledOnce()
  expect(media.analyser.disconnect).toHaveBeenCalledOnce()
  expect(media.context.close).toHaveBeenCalledOnce()
})

it('should release the context when graph creation fails', () => {
  const media = microphone()
  media.context.createMediaStreamSource.mockImplementation(() => {
    throw new Error('audio unavailable')
  })
  expect(() =>
    createMicrophoneMeter({onError: vi.fn(), onLevel: vi.fn(), stream: {} as MediaStream}),
  ).toThrow('audio unavailable')
  expect(media.context.close).toHaveBeenCalledOnce()
})

it('should report a resume failure and release the meter without scheduling frames', async () => {
  const media = microphone()
  const failure = new Error('audio unavailable')
  media.context.resume.mockRejectedValue(failure)
  const onError = vi.fn()
  createMicrophoneMeter({onError, onLevel: vi.fn(), stream: {} as MediaStream})
  await Promise.resolve()
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
  expect(media.context.close).toHaveBeenCalledOnce()
  expect(requestAnimationFrame).not.toHaveBeenCalled()
})
