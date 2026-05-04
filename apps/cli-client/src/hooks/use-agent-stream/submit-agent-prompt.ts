import {createInitialAgentJsonStdoutReducerState} from '@/utils/agent-json-stdout-display'
import {postAgentSseStream} from '@/hooks/use-agent-stream/agent-stream'
import {parseHttpErrorBody, resolveRequestUrl} from '@/utils/agent-page'
import {
  type AgentStreamLoopMutable,
  createAgentPostStreamHandlers,
} from '@/hooks/use-agent-stream/create-agent-post-stream-handlers'
import {finalizeAgentStreamSession} from '@/hooks/use-agent-stream/finalize-agent-stream-session'
import {buildAgentStreamRequestBody} from '@/hooks/use-agent-stream/build-agent-stream-request-body'
import {composeAgentFetchNetworkErrorMessage} from '@/hooks/use-agent-stream/compose-agent-fetch-network-error-message'
import type {
  AgentStreamControl,
  UseAgentStreamProperties,
} from '@/hooks/use-agent-stream/use-agent-stream-types'

export interface SubmitAgentPromptOptions {
  readonly event: Event & {currentTarget: HTMLFormElement}
  readonly promptText: string
  readonly properties: UseAgentStreamProperties
  readonly streamControl: AgentStreamControl
  readonly updateLastAssistantContent: (content: string) => void
}

const resetAgentStreamToIdle = (
  streamControl: AgentStreamControl,
  properties: UseAgentStreamProperties,
): void => {
  streamControl.activeController = undefined
  properties.setStatus('idle')
}

export const submitAgentPrompt = async (options: SubmitAgentPromptOptions): Promise<void> => {
  const {event, promptText, properties, streamControl, updateLastAssistantContent} = options

  event.preventDefault()
  streamControl.activeController?.abort()
  streamControl.activeController = undefined

  const trimmed = promptText.trim()

  if (trimmed === '') {
    properties.setStreamError('메시지를 입력해 주세요.')
    return
  }

  properties.setStreamError(null)
  properties.setStatus('running')

  const controller = new AbortController()

  streamControl.activeController = controller

  const mutable: AgentStreamLoopMutable = {
    exitCode: null,
    exitSignalText: '',
    sessionIdParser: undefined,
    stderrOutput: '',
    stdoutJsonState: createInitialAgentJsonStdoutReducerState(),
  }

  let requestUrl = ''

  try {
    const resolvedRequestUrl = resolveRequestUrl(properties.getPostUrl())

    if ('error' in resolvedRequestUrl) {
      properties.setStreamError(resolvedRequestUrl.error)
      properties.setStatus('idle')
      streamControl.activeController = undefined
      return
    }

    requestUrl = resolvedRequestUrl.url

    const requestBody = buildAgentStreamRequestBody({
      conversationId: properties.getConversationId(),
      prompt: trimmed,
      resumeSessionId: properties.getResumeSessionId(),
      workingDirectory: properties.getWorkingDirectory(),
    })

    const streamResult = await postAgentSseStream({
      body: requestBody,
      createHandlers: createAgentPostStreamHandlers({
        mutable,
        properties,
        trimmed,
        updateLastAssistantContent,
      }),
      signal: controller.signal,
      url: requestUrl,
    })

    if (streamResult.status === 'http-error') {
      resetAgentStreamToIdle(streamControl, properties)

      try {
        properties.setStreamError(await parseHttpErrorBody(streamResult.response))
      } catch (error) {
        properties.setStreamError(error instanceof Error ? error.message : String(error))
      }
    }
  } catch (error) {
    resetAgentStreamToIdle(streamControl, properties)

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log(
        mutable.sessionIdParser === undefined
          ? '[agent] fetch aborted before response'
          : '[agent] stream read aborted',
      )
      return
    }

    const reason = error instanceof Error ? error.message : String(error)

    if (mutable.sessionIdParser === undefined) {
      properties.setStreamError(
        composeAgentFetchNetworkErrorMessage({
          postUrlFallback: properties.getPostUrl(),
          reason,
          requestUrl,
        }),
      )
    } else {
      properties.setStreamError(reason)
    }
  } finally {
    if (mutable.sessionIdParser !== undefined) {
      finalizeAgentStreamSession({
        controller,
        mutable,
        properties,
        requestUrl,
        streamControl,
      })
    }
  }
}
