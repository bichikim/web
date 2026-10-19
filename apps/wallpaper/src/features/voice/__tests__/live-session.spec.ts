import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {generateLiveSpeech} from '../live-session'

const {invoke, native, capture, loadCue, order} = vi.hoisted(() => ({
  capture: vi.fn(),
  invoke: vi.fn(),
  loadCue: vi.fn(),
  native: vi.fn(),
  order: [] as string[],
}))
vi.mock('@tauri-apps/api/core', () => ({
  Channel: class {
    onmessage = () => undefined
  },
  invoke,
  isTauri: native,
}))
vi.mock('../capture-audio', () => ({captureAudio: capture}))
vi.mock('../load-read-cue', () => ({loadReadCue: loadCue}))
const audio = {sampleRate: 48000, samples: Float32Array.of(0.1)}
const output = () => Promise.withResolvers<typeof audio>()
let recording: ReturnType<typeof output>
const localTrack = {stop: vi.fn()}
const source = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  offset: {value: 0},
  start: vi.fn(),
  stop: vi.fn(),
}
const destination = {stream: {getAudioTracks: () => [localTrack]}}
const cue = {
  buffer: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(() => order.push('cue')),
}
const channel = {
  close: vi.fn(),
  onmessage: null as ((event: {data: string}) => void) | null,
  onopen: null as (() => void) | null,
  readyState: 'open',
}
class Peer {
  static current: Peer
  connectionState = 'connected'
  localDescription: RTCSessionDescriptionInit | null = null
  onconnectionstatechange: (() => void) | null = null
  ontrack: ((event: {track: {kind: string}}) => void) | null = null
  addTrack = vi.fn()
  close = vi.fn()
  createDataChannel = () => channel
  createOffer = vi.fn().mockResolvedValue({
    sdp: 'v=0\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n',
    type: 'offer',
  })
  getStats = vi.fn().mockResolvedValue(new Map())
  setLocalDescription = async (value: RTCSessionDescriptionInit) => {
    this.localDescription = value
  }
  setRemoteDescription = vi.fn(async () => {
    order.push('remote')
    this.ontrack?.({track: {kind: 'audio'}})
    channel.onmessage?.({data: JSON.stringify({type: 'session.started'})})
    this.onconnectionstatechange?.()
  })
  constructor() {
    Peer.current = this
  }
}
class Context {
  currentTime = 0
  suspend = vi.fn(async () => {
    order.push('suspend')
  })
  close = vi.fn().mockResolvedValue(undefined)
  createConstantSource = () => source
  createBufferSource = () => cue
  createMediaStreamDestination = () => destination
  resume = vi.fn(async () => {
    order.push('resume')
    recording.resolve(audio)
  })
}
const dispose = vi.fn()
beforeEach(() => {
  native.mockReturnValue(true)
  loadCue.mockResolvedValue({})
  recording = output()
  capture.mockResolvedValue({
    audio: recording.promise,
    begin: () => order.push('capture'),
    complete: vi.fn(),
    dispose,
  })
  invoke.mockImplementation(async (method: string) => {
    order.push(method)
    return {sdp: 'v=0\r\n'}
  })
  vi.stubGlobal('RTCPeerConnection', Peer)
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('MediaStream', class {})
})
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  order.length = 0
})

it('should send text at creation, apply SDP before attaching and start the audio clock only when ready', async () => {
  const result = await generateLiveSpeech('문장을 읽어요.', new AbortController().signal, 'ko')
  expect(result).toEqual(audio)
  expect(invoke).toHaveBeenCalledWith(
    'start_codex_live_voice',
    expect.objectContaining({
      language: 'ko',
      offer: 'v=0\r\n',
      requestId: expect.any(String),
      text: '문장을 읽어요.',
    }),
  )
  expect(order.indexOf('remote')).toBeLessThan(order.indexOf('attach_codex_live_voice'))
  expect(order.indexOf('suspend')).toBeLessThan(order.indexOf('start_codex_live_voice'))
  expect(order.indexOf('attach_codex_live_voice')).toBeLessThan(order.indexOf('resume'))
  expect(order.indexOf('capture')).toBeLessThan(order.indexOf('resume'))
  expect(order.indexOf('attach_codex_live_voice')).toBeLessThan(order.indexOf('capture'))
  expect(order.indexOf('resume')).toBeLessThan(order.indexOf('cue'))
  expect(cue.connect).toHaveBeenCalledExactlyOnceWith(destination)
  expect(cue.start).toHaveBeenCalledExactlyOnceWith(0.5)
  expect(cue.disconnect).toHaveBeenCalledOnce()
  expect(dispose).toHaveBeenCalledOnce()
  expect(Peer.current.close).toHaveBeenCalledOnce()
  expect(localTrack.stop).toHaveBeenCalledOnce()
  expect(source.stop).toHaveBeenCalledOnce()
})
it('should release transport and cancel again if native registration acknowledges after cancellation', async () => {
  const registered = Promise.withResolvers<void>()
  let acknowledge: () => void = () => undefined
  invoke.mockImplementation((method: string, params: {started?: {onmessage: () => void}}) => {
    if (method === 'start_codex_live_voice') {
      acknowledge = () => params.started?.onmessage()
      registered.resolve()
      return new Promise(() => {})
    }
    return Promise.resolve()
  })
  const controller = new AbortController()
  const pending = generateLiveSpeech('취소', controller.signal, 'ko')
  const rejected = expect(pending).rejects.toMatchObject({name: 'AbortError'})
  await registered.promise
  controller.abort()
  await rejected
  const before = invoke.mock.calls.filter(([method]) => method === 'close_codex_live_voice').length
  acknowledge()
  expect(invoke.mock.calls.filter(([method]) => method === 'close_codex_live_voice')).toHaveLength(
    before + 1,
  )
  expect(Peer.current.setRemoteDescription).not.toHaveBeenCalled()
  expect(Peer.current.close).toHaveBeenCalledOnce()
})
