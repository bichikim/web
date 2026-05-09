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
}

const resetAgentStreamToIdle = (
  streamControl: AgentStreamControl,
  properties: UseAgentStreamProperties,
  runId: number,
): void => {
  if (streamControl.runId !== runId) {
    return
  }

  streamControl.activeController = undefined
  properties.setStatus('idle')
}

export const submitAgentPrompt = async (options: SubmitAgentPromptOptions): Promise<void> => {
  const {event, promptText, properties, streamControl} = options

  event.preventDefault()
  streamControl.activeController?.abort()
  streamControl.activeController = undefined
  streamControl.runId += 1
  const runId = streamControl.runId

  const trimmed = promptText.trim()

  if (trimmed === '') {
    properties.setStreamError('메시지를 입력해 주세요.')
    properties.setStatus('idle')
    return
  }

  properties.setStreamError(null)
  properties.setStatus('running')

  const controller = new AbortController()

  streamControl.activeController = controller

  // `createHandlers` runs before fetch resolves, so later HTTP/read failures still
  // enter finalization. Keep success-only cleanup gated until the stream fully ends.
  const mutable: AgentStreamLoopMutable = {
    assistantMessageId: undefined,
    didConsumeStream: false,
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
      if (streamControl.runId === runId) {
        streamControl.activeController = undefined
      }
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
        runId,
        streamControl,
        trimmed,
      }),
      signal: controller.signal,
      url: requestUrl,
    })

    if (streamResult.status === 'http-error') {
      resetAgentStreamToIdle(streamControl, properties, runId)

      if (streamControl.runId !== runId) {
        return
      }

      try {
        properties.setStreamError(await parseHttpErrorBody(streamResult.response))
      } catch (error) {
        properties.setStreamError(error instanceof Error ? error.message : String(error))
      }

      return
    }

    // Only this path means the SSE reader consumed the response without throwing.
    mutable.didConsumeStream = true
  } catch (error) {
    resetAgentStreamToIdle(streamControl, properties, runId)

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log(
        mutable.sessionIdParser === undefined
          ? '[agent] fetch aborted before response'
          : '[agent] stream read aborted',
      )
      return
    }

    if (streamControl.runId !== runId) {
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
        runId,
        streamControl,
      })
    }
  }
}
