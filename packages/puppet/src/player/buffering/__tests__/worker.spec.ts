import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createBufferEngine} from '../create-buffer-engine'
import {loadWasmTransform} from '../../internal/wasm/deformation/load-transform'
import type {BufferRequest, BufferResponse} from '../types'

vi.mock('../create-buffer-engine', () => ({createBufferEngine: vi.fn()}))
vi.mock('../../internal/wasm/deformation/load-transform', () => ({loadWasmTransform: vi.fn()}))
afterEach(() => {
  vi.resetAllMocks()
  vi.resetModules()
  vi.unstubAllGlobals()
})

test('should preserve audio message order while the Wasm module initializes', async () => {
  let initialize = () => {}
  const initialization = new Promise<undefined>((resolve) => {
    initialize = () => resolve(undefined)
  })
  let complete = () => {}
  const completed = new Promise<void>((resolve) => {
    complete = resolve
  })
  vi.mocked(loadWasmTransform).mockReturnValue(initialization)
  const engine = {
    bytes: 0,
    patchAudio: vi.fn(),
    reset: vi.fn(),
    step: vi.fn(),
    updateAudio: vi.fn(),
  }
  vi.mocked(createBufferEngine).mockReturnValue(engine)
  const replies: BufferResponse[] = []
  let receive: (event: MessageEvent<BufferRequest>) => void = () => {}
  vi.stubGlobal('self', {
    addEventListener: (_event: string, listener: typeof receive) => {
      receive = listener
    },
    postMessage: (message: BufferResponse) => {
      replies.push(message)
      if (replies.length === 3) {
        complete()
      }
    },
  })
  await import('../worker')
  receive(
    new MessageEvent('message', {
      data: {
        audio: new Map(),
        document: createEmptyDocument(),
        id: 1,
        kind: 'initialize',
      },
    }),
  )
  receive(
    new MessageEvent('message', {
      data: {
        id: 2,
        kind: 'audio',
        removed: [],
        sounds: new Map(),
      },
    }),
  )
  initialize()
  receive(
    new MessageEvent('message', {
      data: {id: 3, kind: 'audio', removed: ['old'], sounds: new Map()},
    }),
  )
  await completed
  expect(replies.map((message) => [message.id, message.kind])).toEqual([
    [1, 'initialized'],
    [2, 'audio'],
    [3, 'audio'],
  ])
  expect(engine.patchAudio).toHaveBeenCalledTimes(2)
  expect(engine.patchAudio.mock.calls[1]?.[1]).toEqual(['old'])
})
