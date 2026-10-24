import {vi} from 'vitest'

interface ResponseWaiter<Response> {
  (response: Response): void
}

/** Worker 모듈의 실제 메시지 리스너와 응답을 연결한다. */
export const loadExclusiveWorker = async <Request, Response extends {readonly type: string}>(
  load: () => Promise<unknown>,
) => {
  let listener: ((event: MessageEvent<Request>) => void) | undefined
  const waiters = new Map<string, ResponseWaiter<Response>>()
  const postMessage = vi.fn((response: Response) => {
    waiters.get(response.type)?.(response)
    waiters.delete(response.type)
  })
  vi.stubGlobal('self', {
    addEventListener: (_type: string, receive: (event: MessageEvent<Request>) => void) => {
      listener = receive
    },
    postMessage,
  })
  await load()
  return {
    dispatch: (request: Request) => {
      if (listener === undefined) {
        throw new Error('Worker listener was not registered')
      }
      listener(new MessageEvent('message', {data: request}))
    },
    nextResponse: (type: Response['type']) =>
      new Promise<Response>((resolve) => {
        waiters.set(type, resolve)
      }),
    postMessage,
  }
}
