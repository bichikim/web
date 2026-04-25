import {type SseEventBlock, parseSseEventBlock} from '@/utils/parse-sse-event-block'
import {postSseStream, type PostSseStreamResult} from '@/utils/post-sse-stream'

import {type AgentExitPayload, parseAgentExitEventData} from '@/hooks/use-agent-stream/parse-agent-exit-event-data'
import {parseAgentErrorEventMessage} from '@/hooks/use-agent-stream/parse-agent-error-event-message'

export type {AgentExitPayload} from '@/hooks/use-agent-stream/parse-agent-exit-event-data'

export interface AgentStreamHandlers {
  readonly onStdout: (chunk: string) => void
  readonly onStderr: (chunk: string) => void
  readonly onExit: (payload: AgentExitPayload) => void
  readonly onErrorEvent: (message: string) => void
}

const dispatchExitEvent = (
  exitResult: ReturnType<typeof parseAgentExitEventData>,
  handlers: AgentStreamHandlers,
): void => {
  if (exitResult.kind === 'parse-error') {
    handlers.onErrorEvent('exit 이벤트 파싱에 실패했습니다.')

    return
  }

  handlers.onExit(exitResult.payload)
}

const dispatchSseMessage = (parsed: SseEventBlock, handlers: AgentStreamHandlers): void => {
  if (parsed.event === 'stdout') {
    handlers.onStdout(parsed.data)

    return
  }

  if (parsed.event === 'stderr') {
    handlers.onStderr(parsed.data)

    return
  }

  if (parsed.event === 'exit') {
    dispatchExitEvent(parseAgentExitEventData(parsed.data), handlers)

    return
  }

  if (parsed.event === 'error') {
    handlers.onErrorEvent(parseAgentErrorEventMessage(parsed.data))
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
      const parsed = parseSseEventBlock(rawBlock)

      if (parsed !== undefined) {
        dispatchSseMessage(parsed, handlers)
      }
    },
    signal: arguments_.signal,
    url: arguments_.url,
  })
}
