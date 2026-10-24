import {type Mock, vi} from 'vitest'

type WorkerListener<Response> = (event: ErrorEvent | MessageEvent<Response>) => void

export interface WorkerErrorEvent {
  readonly error?: unknown
  readonly message: string
}

export interface CreateWorkerHarnessOptions {
  /**
   * 생성 시 읽어 오류 리스너마다 호출 직전에 메시지와 원인을 전달한다.
   * 호출자는 리스너가 소유할 새 이벤트 객체를 반환하며, 예외는 그대로 전파된다.
   * 생략하면 원인을 사용하지 않고 message만 가진 새 객체를 만든다.
   */
  readonly createErrorEvent?: (message: string, error: unknown) => WorkerErrorEvent
}

export interface WorkerHarness<Response> {
  readonly postMessage: Mock
  readonly terminate: Mock
  addEventListener(type: string, listener: WorkerListener<Response>): void
  emitError(message: string, error?: unknown): void
  emitMessage(message: Response): void
  emitMessageError(): void
}

export interface WorkerHarnessClass<Response> {
  new (): WorkerHarness<Response>
  current: WorkerHarness<Response> | null
}

/** 독립된 current를 가지며 리스너를 등록 순서대로 동기 호출하는 Worker 모의 클래스를 만든다. */
export const createWorkerHarness = <Response>(
  options: CreateWorkerHarnessOptions = {},
): WorkerHarnessClass<Response> => {
  const createErrorEvent = options.createErrorEvent ?? ((message: string) => ({message}))

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

    emitError(message: string, error?: unknown) {
      for (const listener of this.#listeners.get('error') ?? []) {
        listener(createErrorEvent(message, error) as ErrorEvent)
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
