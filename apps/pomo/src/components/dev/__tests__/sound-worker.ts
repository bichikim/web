import {vi} from 'vitest'

export class TestWorker {
  static current: TestWorker
  onmessage: ((event: {data: unknown}) => void) | null = null
  onerror: ((event: {message: string}) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    TestWorker.current = this
  }
}
