import {afterEach, expect, it, vi} from 'vitest'
import {captureAudio} from '../capture-audio'

vi.mock('../capture.worklet.ts?worker&url', () => ({default: 'capture.js'}))
class Processor {
  static current: Processor
  port = {
    close: vi.fn(),
    onmessage: null as ((event: {data: {samples: Float32Array}}) => void) | null,
  }
  connect = vi.fn().mockReturnThis()
  disconnect = vi.fn()
  constructor() {
    Processor.current = this
  }
}
const fixture = async (onAudio?: (audio: {sampleRate: number; samples: Float32Array}) => void) => {
  vi.useFakeTimers()
  vi.stubGlobal('AudioWorkletNode', Processor)
  const input = {connect: vi.fn().mockReturnThis(), disconnect: vi.fn()}
  const context = {
    audioWorklet: {addModule: vi.fn().mockResolvedValue(undefined)},
    createMediaStreamSource: () => input,
    destination: {},
    sampleRate: 1000,
  }
  const controller = new AbortController()
  const capture = await captureAudio(
    context as unknown as AudioContext,
    {} as MediaStream,
    controller.signal,
    onAudio,
  )
  const send = (value: number, length = 100) =>
    Processor.current.port.onmessage?.({data: {samples: new Float32Array(length).fill(value)}})
  return {capture, controller, input, send}
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
it('should stream audible samples before completion without replaying leading silence', async () => {
  const received = vi.fn()
  const {capture, send} = await fixture(received)
  capture.begin()
  send(0, 2000)
  expect(received).not.toHaveBeenCalled()
  send(0.1, 100)
  expect(received).not.toHaveBeenCalled()
  send(0.2, 100)
  expect(received).toHaveBeenCalledOnce()
  expect(received.mock.calls[0][0].samples.length).toBe(200)
  send(0.3, 100)
  expect(received).toHaveBeenCalledTimes(2)
  capture.complete()
  send(0, 500)
  expect((await capture.audio).samples.length).toBe(329)
  capture.dispose()
})
it('should start the silence deadline after preparation and preserve an earlier completion event', async () => {
  const {capture, send} = await fixture()
  capture.complete(1000)
  await vi.advanceTimersByTimeAsync(15000)
  capture.begin()
  send(0.1, 1000)
  send(0, 500)
  expect((await capture.audio).samples.length).toBe(1019)
  capture.dispose()
})
it('should wait for the declared audio endpoint even when the completion event arrives early', async () => {
  const {capture, send} = await fixture()
  capture.begin()
  send(0.1, 1000)
  capture.complete(3000)
  send(0, 1000)
  let settled = false
  capture.audio.then(() => {
    settled = true
  })
  await Promise.resolve()
  expect(settled).toBe(false)
  send(0.1, 1000)
  send(0, 500)
  expect((await capture.audio).samples.length).toBe(3019)
  capture.dispose()
})

it('should reject silent output rather than reporting it as read', async () => {
  const {capture, send} = await fixture()
  capture.begin()
  send(0, 1000)
  capture.complete()
  const rejected = expect(capture.audio).rejects.toMatchObject({code: 'silent'})
  await vi.advanceTimersByTimeAsync(12000)
  await rejected
  capture.dispose()
})
it('should keep the entire utterance until completion and trim surrounding silence', async () => {
  const {capture, send} = await fixture()
  capture.begin()
  send(0, 1000)
  send(0.1, 1000)
  send(0, 500)
  let settled = false
  capture.audio.then(() => {
    settled = true
  })
  await Promise.resolve()
  expect(settled).toBe(false)
  send(0.2, 1000)
  capture.complete()
  send(0, 500)
  const audio = await capture.audio
  expect(audio.sampleRate).toBe(1000)
  expect(audio.samples.length).toBe(2529)
  expect(Math.max(...audio.samples)).toBeCloseTo(0.2)
  capture.dispose()
})
it('should reject an interrupted utterance and release the capture graph', async () => {
  const {capture, controller, input, send} = await fixture()
  capture.begin()
  send(0.1, 1000)
  const rejected = expect(capture.audio).rejects.toMatchObject({name: 'AbortError'})
  controller.abort()
  await rejected
  capture.dispose()
  expect(input.disconnect).toHaveBeenCalledOnce()
  expect(Processor.current.disconnect).toHaveBeenCalledOnce()
  expect(Processor.current.port.onmessage).toBe(null)
})
it('should reject a truncated utterance when no completion event arrives', async () => {
  const {capture, send} = await fixture()
  capture.begin()
  send(0.1, 1000)
  const rejected = expect(capture.audio).rejects.toMatchObject({code: 'incomplete'})
  await vi.advanceTimersByTimeAsync(90000)
  await rejected
  capture.dispose()
})
