/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createSupertonicClient} from '../features/supertonic/client'
import type {SupertonicWorkerOutput} from '../features/supertonic/messages'

class FakeWorker {
  static current: FakeWorker | null = null

  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
  readonly #listeners = new Map<
    string,
    Array<(event: MessageEvent<SupertonicWorkerOutput>) => void>
  >()

  constructor() {
    FakeWorker.current = this
  }

  addEventListener(type: string, listener: (event: MessageEvent<SupertonicWorkerOutput>) => void) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  emitMessage(message: SupertonicWorkerOutput) {
    for (const listener of this.#listeners.get('message') ?? []) {
      listener({data: message} as MessageEvent<SupertonicWorkerOutput>)
    }
  }
}

const getWorker = () => {
  const worker = FakeWorker.current

  if (worker === null) {
    throw new Error('Worker가 생성되지 않았습니다.')
  }

  return worker
}

beforeEach(() => {
  FakeWorker.current = null
  document.documentElement.lang = 'ko-KR'
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('supertonic concurrent initialize', () => {
  it('should resolve every concurrent initialize caller when ready arrives', async () => {
    const client = createSupertonicClient()
    const worker = getWorker()
    const first = client.initialize({modelId: 'int8'})
    const second = client.initialize({modelId: 'full'})

    expect(worker.postMessage).toHaveBeenCalledTimes(2)
    worker.emitMessage({backend: 'wasm', type: 'ready'})

    await expect(second).resolves.toEqual({ok: true, value: undefined})

    const firstOutcome = await Promise.race([
      first.then(() => 'resolved' as const),
      new Promise<'pending'>((resolve) => {
        setTimeout(() => resolve('pending'), 50)
      }),
    ])

    expect(firstOutcome).toBe('resolved')
  })
})
