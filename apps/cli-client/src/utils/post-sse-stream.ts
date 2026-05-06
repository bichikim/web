import {consumeSseStream} from '@/utils/consume-sse-stream'

export interface PostSseStreamOptions {
  readonly fetch: typeof fetch
  readonly url: string
  readonly body: unknown
  readonly signal?: AbortSignal
  readonly onResponseOk?: () => Promise<void> | void
  readonly onRawBlock: (rawBlock: string) => void
}

export interface PostSseStreamConsumed {
  readonly status: 'consumed'
}

export interface PostSseStreamHttpError {
  readonly status: 'http-error'
  readonly response: Response
}

export type PostSseStreamResult = PostSseStreamConsumed | PostSseStreamHttpError

export const postSseStream = async (
  options: PostSseStreamOptions,
): Promise<PostSseStreamResult> => {
  const {body, fetch: fetchRequest, onRawBlock, onResponseOk, signal, url} = options

  const response = await fetchRequest(url, {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
    signal,
  })

  if (!response.ok) {
    return {response, status: 'http-error'}
  }

  await onResponseOk?.()
  await consumeSseStream({onRawBlock, response})

  return {status: 'consumed'}
}
