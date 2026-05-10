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

interface HandleAgentHttpErrorOptions {
  readonly properties: UseAgentStreamProperties
  readonly response: Response
  readonly runId: number
  readonly streamControl: AgentStreamControl
}

interface HandleAgentStreamErrorOptions {
  readonly error: unknown
  readonly mutable: AgentStreamLoopMutable
  readonly properties: UseAgentStreamProperties
  readonly requestUrl: string
  readonly runId: number
  readonly streamControl: AgentStreamControl
}

const isLatestAgentRun = (streamControl: AgentStreamControl, runId: number): boolean =>
  streamControl.runId === runId

const resetAgentStreamToIdle = (
  streamControl: AgentStreamControl,
  properties: UseAgentStreamProperties,
  runId: number,
): void => {
  if (!isLatestAgentRun(streamControl, runId)) {
    return
  }

  streamControl.activeController = undefined
  properties.setStatus('idle')
}

const startNextAgentRun = ({
  event,
  streamControl,
}: {
  readonly event: Event & {currentTarget: HTMLFormElement}
  readonly streamControl: AgentStreamControl
}): number => {
  event.preventDefault()
  streamControl.activeController?.abort()
  streamControl.activeController = undefined
  streamControl.runId += 1

  const {runId} = streamControl

  return runId
}

const createAgentStreamLoopMutable = (): AgentStreamLoopMutable => ({
  assistantMessageId: undefined,
  didConsumeStream: false,
  exitCode: null,
  exitSignalText: '',
  sessionIdParser: undefined,
  stderrOutput: '',
  stdoutJsonState: createInitialAgentJsonStdoutReducerState(),
})

const handleAgentHttpError = async (options: HandleAgentHttpErrorOptions): Promise<void> => {
  const {properties, response, runId, streamControl} = options

  resetAgentStreamToIdle(streamControl, properties, runId)

  if (!isLatestAgentRun(streamControl, runId)) {
    return
  }

  try {
    properties.setStreamError(await parseHttpErrorBody(response))
  } catch (error) {
    properties.setStreamError(error instanceof Error ? error.message : String(error))
  }
}

const handleAgentStreamError = (options: HandleAgentStreamErrorOptions): void => {
  const {error, mutable, properties, requestUrl, runId, streamControl} = options

  resetAgentStreamToIdle(streamControl, properties, runId)

  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log(
      mutable.sessionIdParser === undefined
        ? '[agent] fetch aborted before response'
        : '[agent] stream read aborted',
    )
    return
  }

  if (!isLatestAgentRun(streamControl, runId)) {
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
}

export const submitAgentPrompt = async (options: SubmitAgentPromptOptions): Promise<void> => {
  const {event, promptText, properties, streamControl} = options
  const runId = startNextAgentRun({event, streamControl})

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

  const mutable = createAgentStreamLoopMutable()

  let requestUrl = ''

  try {
    const resolvedRequestUrl = resolveRequestUrl(properties.getPostUrl())

    if ('error' in resolvedRequestUrl) {
      properties.setStreamError(resolvedRequestUrl.error)
      properties.setStatus('idle')
      if (isLatestAgentRun(streamControl, runId)) {
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
      await handleAgentHttpError({
        properties,
        response: streamResult.response,
        runId,
        streamControl,
      })
      return
    }

    // Only this path means the SSE reader consumed the response without throwing.
    mutable.didConsumeStream = true
  } catch (error) {
    handleAgentStreamError({error, mutable, properties, requestUrl, runId, streamControl})
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
