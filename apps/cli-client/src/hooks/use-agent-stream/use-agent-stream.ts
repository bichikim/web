import type {ChatMessage} from '@/components/agent/AgentChatSection'
import {
  type AgentJsonStdoutReducerState,
  createInitialAgentJsonStdoutReducerState,
  feedAgentJsonStdoutChunk,
  flushAgentJsonStdoutBuffer,
} from '@/utils/agent-json-stdout-display'
import {postAgentSseStream} from '@/hooks/use-agent-stream/agent-stream'
import {parseHttpErrorBody, resolveRequestUrl} from '@/utils/agent-page'
import {hasProcessFailureIndicators} from '@/hooks/use-agent-stream/has-process-failure-indicators'
import {truncateWithEllipsis} from '@/utils/truncate-with-ellipsis'
import {updateLastMessageContentByRole} from '@/hooks/use-agent-stream/update-last-message-content-by-role'
import {buildAgentStreamRequestBody} from '@/hooks/use-agent-stream/build-agent-stream-request-body'
import {composeAgentFetchNetworkErrorMessage} from '@/hooks/use-agent-stream/compose-agent-fetch-network-error-message'
import {composeAgentStreamFailureErrorMessage} from '@/hooks/use-agent-stream/compose-agent-stream-failure-error-message'
import {createAgentSessionIdStdoutParser} from '@/hooks/use-agent-stream/create-agent-session-id-stdout-parser'
import {finalizeAssistantMessageContent} from '@/hooks/use-agent-stream/finalize-assistant-message-content'
import {SESSION_TITLE_TRUNCATE_MAX_LENGTH} from '@/hooks/use-agent-stream/session-title-truncate-max-length'

interface UseAgentStreamProperties {
  readonly getPostUrl: () => string
  readonly getWorkingDirectory: () => string
  readonly getConversationId: () => string
  readonly getResumeSessionId: () => string | null
  readonly clearResumeSessionId: () => void
  readonly getMessages: () => readonly ChatMessage[]
  readonly setMessages: (setter: (previous: ChatMessage[]) => ChatMessage[]) => void
  readonly setPromptText: (value: string) => void
  readonly setStatus: (value: 'idle' | 'running' | 'done') => void
  readonly setStreamError: (value: string | null) => void
  readonly setCurrentSessionId: (value: string | null) => void
  readonly setCurrentSessionTitle: (value: string | null) => void
}

export const useAgentStream = (properties: UseAgentStreamProperties) => {
  let activeController: AbortController | undefined
  let stdoutJsonState: AgentJsonStdoutReducerState = createInitialAgentJsonStdoutReducerState()

  const updateLastAssistantContent = (content: string) => {
    properties.setMessages((previous) =>
      updateLastMessageContentByRole(previous, 'assistant', content),
    )
  }

  const abortRun = () => {
    activeController?.abort()
    activeController = undefined
  }

  const submitPrompt = async ({
    event,
    promptText,
  }: {
    event: Event & {currentTarget: HTMLFormElement}
    promptText: string
  }): Promise<void> => {
    event.preventDefault()
    abortRun()

    const trimmed = promptText.trim()

    if (trimmed === '') {
      properties.setStreamError('메시지를 입력해 주세요.')
      return
    }

    properties.setStreamError(null)
    properties.setStatus('running')

    const controller = new AbortController()

    activeController = controller

    let requestUrl = ''
    let stderrOutput = ''
    let exitCode: number | null = null
    let exitSignalText = ''
    let streamConsumed = false
    let sessionIdParser: ReturnType<typeof createAgentSessionIdStdoutParser> | undefined

    try {
      const resolvedRequestUrl = resolveRequestUrl(properties.getPostUrl())

      if ('error' in resolvedRequestUrl) {
        properties.setStreamError(resolvedRequestUrl.error)
        properties.setStatus('idle')
        activeController = undefined
        return
      }

      requestUrl = resolvedRequestUrl.url

      const requestBody = buildAgentStreamRequestBody({
        conversationId: properties.getConversationId(),
        prompt: trimmed,
        workingDirectory: properties.getWorkingDirectory(),
        resumeSessionId: properties.getResumeSessionId(),
      })

      const streamResult = await postAgentSseStream({
        body: requestBody,
        createHandlers: () => {
          const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: trimmed,
          }
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
          }

          const hadUserBefore = properties.getMessages().some((message) => message.role === 'user')
          if (!hadUserBefore) {
            properties.setCurrentSessionTitle(
              truncateWithEllipsis(trimmed, SESSION_TITLE_TRUNCATE_MAX_LENGTH),
            )
          }

          properties.setMessages((previous) => [...previous, userMessage, assistantMessage])
          properties.setPromptText('')
          stdoutJsonState = createInitialAgentJsonStdoutReducerState()

          const parser = createAgentSessionIdStdoutParser((sessionId) => {
            properties.setCurrentSessionId(sessionId)
          })

          sessionIdParser = parser

          return {
            onErrorEvent: (message) => {
              console.error('[agent sse error]', message)
              properties.setStreamError(message)
            },
            onExit: (payload) => {
              console.log('[agent exit]', payload)
              exitCode = payload.code
              exitSignalText = payload.signal ?? ''
            },
            onStderr: (chunk) => {
              console.warn('[agent stderr]', chunk)
              stderrOutput += chunk
            },
            onStdout: (chunk) => {
              parser.onStdoutChunk(chunk)
              stdoutJsonState = feedAgentJsonStdoutChunk(stdoutJsonState, chunk)
              updateLastAssistantContent(stdoutJsonState.display)
            },
          }
        },
        signal: controller.signal,
        url: requestUrl,
      })

      if (streamResult.status === 'http-error') {
        activeController = undefined
        properties.setStatus('idle')

        try {
          properties.setStreamError(await parseHttpErrorBody(streamResult.response))
        } catch (error) {
          properties.setStreamError(error instanceof Error ? error.message : String(error))
        }

        return
      }

      streamConsumed = true
    } catch (error) {
      activeController = undefined
      properties.setStatus('idle')

      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log(
          sessionIdParser === undefined
            ? '[agent] fetch aborted before response'
            : '[agent] stream read aborted',
        )
        return
      }

      const reason = error instanceof Error ? error.message : String(error)

      if (sessionIdParser === undefined) {
        properties.setStreamError(
          composeAgentFetchNetworkErrorMessage({
            reason,
            requestUrl,
            postUrlFallback: properties.getPostUrl(),
          }),
        )
        return
      }

      properties.setStreamError(reason)
      return
    } finally {
      if (sessionIdParser === undefined) {
        return
      }

      sessionIdParser.flush()
      activeController = undefined
      stdoutJsonState = flushAgentJsonStdoutBuffer(stdoutJsonState)
      const display = stdoutJsonState.display
      const hasStreamFailure = hasProcessFailureIndicators({
        exitCode,
        signalText: exitSignalText,
        stderrText: stderrOutput,
      })

      properties.setMessages((previous) =>
        updateLastMessageContentByRole(
          previous,
          'assistant',
          finalizeAssistantMessageContent({
            display,
            aborted: controller.signal.aborted,
            hasStreamFailure,
          }),
        ),
      )

      if (hasStreamFailure) {
        properties.setStreamError(
          composeAgentStreamFailureErrorMessage({
            requestUrl,
            exitCode,
            exitSignalText,
            stderrOutput,
          }),
        )
      } else if (streamConsumed && !controller.signal.aborted) {
        properties.clearResumeSessionId()
      }

      if (streamConsumed || controller.signal.aborted) {
        properties.setStatus('done')
      }
    }
  }

  return {
    abortRun,
    submitPrompt,
  }
}
