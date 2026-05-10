import type {ChatMessage} from '@/components/agent/AgentChatSection'
import {
  type AgentJsonStdoutReducerState,
  createInitialAgentJsonStdoutReducerState,
  feedAgentJsonStdoutChunk,
} from '@/utils/agent-json-stdout-display'
import {truncateWithEllipsis} from '@/utils/truncate-with-ellipsis'
import {createAgentSessionIdStdoutParser} from '@/hooks/use-agent-stream/create-agent-session-id-stdout-parser'
import type {AgentExitPayload} from '@/hooks/use-agent-stream/parse-agent-exit-event-data'
import {SESSION_TITLE_TRUNCATE_MAX_LENGTH} from '@/hooks/use-agent-stream/session-title-truncate-max-length'
import {updateMessageContentById} from '@/hooks/use-agent-stream/update-message-content-by-id'
import type {
  AgentStreamControl,
  UseAgentStreamProperties,
} from '@/hooks/use-agent-stream/use-agent-stream-types'

export interface AgentStreamLoopMutable {
  assistantMessageId: string | undefined
  didConsumeStream: boolean
  exitCode: number | null
  exitSignalText: string
  sessionIdParser: ReturnType<typeof createAgentSessionIdStdoutParser> | undefined
  stderrOutput: string
  stdoutJsonState: AgentJsonStdoutReducerState
}

export interface CreateAgentPostStreamHandlersOptions {
  readonly mutable: AgentStreamLoopMutable
  readonly properties: UseAgentStreamProperties
  readonly runId: number
  readonly streamControl: AgentStreamControl
  readonly trimmed: string
}

export const createAgentPostStreamHandlers = (options: CreateAgentPostStreamHandlersOptions) => {
  const {mutable, properties, runId, streamControl, trimmed} = options

  return () => {
    const userMessage: ChatMessage = {
      content: trimmed,
      id: crypto.randomUUID(),
      role: 'user',
    }
    const assistantMessage: ChatMessage = {
      content: '',
      id: crypto.randomUUID(),
      role: 'assistant',
    }

    const hadUserBefore = properties.getMessages().some((message) => message.role === 'user')
    if (!hadUserBefore) {
      properties.setCurrentSessionTitle(
        truncateWithEllipsis(trimmed, SESSION_TITLE_TRUNCATE_MAX_LENGTH),
      )
    }

    properties.setMessages((previous) => [...previous, userMessage, assistantMessage])
    properties.setPromptText('')
    mutable.assistantMessageId = assistantMessage.id
    mutable.stdoutJsonState = createInitialAgentJsonStdoutReducerState()

    const parser = createAgentSessionIdStdoutParser((sessionId) => {
      if (streamControl.runId !== runId) {
        return
      }

      properties.setCurrentSessionId(sessionId)
    })

    mutable.sessionIdParser = parser

    return {
      onErrorEvent: (message: string) => {
        console.error('[agent sse error]', message)
        properties.setStreamError(message)
      },
      onExit: (payload: AgentExitPayload) => {
        console.log('[agent exit]', payload)
        mutable.exitCode = payload.code
        mutable.exitSignalText = payload.signal ?? ''
      },
      onStderr: (chunk: string) => {
        console.warn('[agent stderr]', chunk)
        mutable.stderrOutput += chunk
      },
      onStdout: (chunk: string) => {
        parser.onStdoutChunk(chunk)
        mutable.stdoutJsonState = feedAgentJsonStdoutChunk(mutable.stdoutJsonState, chunk)
        properties.setMessages((previous) =>
          updateMessageContentById(previous, assistantMessage.id, mutable.stdoutJsonState.display),
        )
      },
    }
  }
}
