import {postSseStream, type PostSseStreamResult} from '@/utils/post-sse-stream'

export interface AgentExitPayload {
  readonly code: number | null
  readonly signal: string | null
}

export interface AgentStreamHandlers {
  readonly onStdout: (chunk: string) => void
  readonly onStderr: (chunk: string) => void
  readonly onExit: (payload: AgentExitPayload) => void
  readonly onErrorEvent: (message: string) => void
}

interface SseMessage {
  readonly event: string
  readonly data: string
}

const parseSseBlock = (block: string): SseMessage | undefined => {
  const lines = block.split('\n')
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  if (dataLines.length === 0) {
    return undefined
  }

  return {event: eventName, data: dataLines.join('\n')}
}

const dispatchSseMessage = (parsed: SseMessage, handlers: AgentStreamHandlers): void => {
  if (parsed.event === 'stdout') {
    handlers.onStdout(parsed.data)

    return
  }

  if (parsed.event === 'stderr') {
    handlers.onStderr(parsed.data)

    return
  }

  if (parsed.event === 'exit') {
    try {
      const payload = JSON.parse(parsed.data) as {code?: unknown; signal?: unknown}
      const code = typeof payload.code === 'number' ? payload.code : null
      const signal =
        payload.signal === null ? null : typeof payload.signal === 'string' ? payload.signal : null
      handlers.onExit({code, signal})
    } catch {
      handlers.onErrorEvent('exit 이벤트 파싱에 실패했습니다.')
    }

    return
  }

  if (parsed.event === 'error') {
    try {
      const payload = JSON.parse(parsed.data) as unknown

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof (payload as {message: unknown}).message === 'string'
      ) {
        handlers.onErrorEvent((payload as {message: string}).message)
      } else {
        handlers.onErrorEvent(parsed.data)
      }
    } catch {
      handlers.onErrorEvent(parsed.data)
    }
  }
}

export interface PostAgentSseStreamArguments {
  readonly url: string
  readonly body: unknown
  readonly signal?: AbortSignal
  readonly createHandlers: () => AgentStreamHandlers | Promise<AgentStreamHandlers>
}

export type PostAgentSseStreamResult = PostSseStreamResult

export const postAgentSseStream = async (
  arguments_: PostAgentSseStreamArguments,
): Promise<PostAgentSseStreamResult> => {
  const handlers = await arguments_.createHandlers()

  return postSseStream({
    body: arguments_.body,
    fetch,
    onRawBlock: (rawBlock) => {
      const parsed = parseSseBlock(rawBlock)

      if (parsed !== undefined) {
        dispatchSseMessage(parsed, handlers)
      }
    },
    signal: arguments_.signal,
    url: arguments_.url,
  })
}
