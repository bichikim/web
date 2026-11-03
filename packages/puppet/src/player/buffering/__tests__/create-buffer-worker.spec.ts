import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import type {PuppetSound} from '../../audio/decode-wav'
import {createBufferWorker} from '../create-buffer-worker'
import type {BufferRequest, BufferResponse} from '../types'

afterEach(() => vi.unstubAllGlobals())

test('should transfer only newly decoded sounds and remove dropped sounds without resending prior PCM', async () => {
  const boundary = {
    onerror: null as Worker['onerror'],
    onmessage: null as ((event: MessageEvent<BufferResponse>) => void) | null,
    onmessageerror: null as Worker['onmessageerror'],
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }
  vi.stubGlobal(
    'Worker',
    vi.fn(function mockWorker() {
      return boundary
    }),
  )
  const wire = createBufferWorker(vi.fn())
  const first: PuppetSound = {
    channels: [new Float32Array([0.25])],
    mono: new Float32Array([0.25]),
    sampleRate: 8000,
  }
  const second: PuppetSound = {
    channels: [new Float32Array([0.5])],
    mono: new Float32Array([0.5]),
    sampleRate: 8000,
  }
  const respond = (kind: 'initialized' | 'audio') => {
    const request = boundary.postMessage.mock.calls.at(-1)![0] as BufferRequest
    const response: BufferResponse =
      kind === 'initialized' ? {bytes: 0, id: request.id, kind} : {id: request.id, kind}
    boundary.onmessage!(new MessageEvent('message', {data: response}))
    return request
  }
  const initialized = wire.initialize(createEmptyDocument(), new Map([['first', first]]))
  respond('initialized')
  await initialized
  const added = wire.updateAudio(
    new Map([
      ['first', first],
      ['second', second],
    ]),
  )
  const addition = respond('audio')
  await added
  expect(addition).toMatchObject({removed: [], sounds: new Map([['second', second]])})
  const removed = wire.updateAudio(new Map([['second', second]]))
  const removal = respond('audio')
  await removed
  expect(removal).toMatchObject({removed: ['first'], sounds: new Map()})
  const count = boundary.postMessage.mock.calls.length
  await wire.updateAudio(new Map([['second', second]]))
  expect(boundary.postMessage).toHaveBeenCalledTimes(count)
  wire.destroy()
})
