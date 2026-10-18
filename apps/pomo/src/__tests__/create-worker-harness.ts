import {type Mock, vi} from 'vitest'

type WorkerListener<Response> = (event: ErrorEvent | MessageEvent<Response>) => void

export interface WorkerHarness<Response> {
  readonly postMessage: Mock
  readonly terminate: Mock
  addEventListener(type: string, listener: WorkerListener<Response>): void
  emitError(message: string): void
  emitMessage(message: Response): void
  emitMessageError(): void
}

export interface WorkerHarnessClass<Response> {
  new (): WorkerHarness<Response>
  current: WorkerHarness<Response> | null
}

/** 독립된 current를 가지며 리스너를 등록 순서대로 동기 호출하는 Worker 모의 클래스를 만든다. */
export const createWorkerHarness = <Response>(): WorkerHarnessClass<Response> => {
  class FakeWorker {
    static current: FakeWorker | null = null

    readonly postMessage = vi.fn()
    readonly terminate = vi.fn()
    readonly #listeners = new Map<string, Array<WorkerListener<Response>>>()

    constructor() {
      FakeWorker.current = this
    }

    addEventListener(type: string, listener: WorkerListener<Response>) {
      const listeners = this.#listeners.get(type) ?? []
      listeners.push(listener)
      this.#listeners.set(type, listeners)
    }

    emitError(message: string) {
      for (const listener of this.#listeners.get('error') ?? []) {
        listener({message} as ErrorEvent)
      }
    }

    emitMessage(message: Response) {
      for (const listener of this.#listeners.get('message') ?? []) {
        listener({data: message} as MessageEvent<Response>)
      }
    }

    emitMessageError() {
      for (const listener of this.#listeners.get('messageerror') ?? []) {
        listener({} as MessageEvent<Response>)
      }
    }
  }

  return FakeWorker
}
