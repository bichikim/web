import {describe, expect, it, vi} from 'vitest'

import type {ChatMessage} from '../../../components/agent/AgentChatSection'
import type {AgentStreamLoopMutable} from '../create-agent-post-stream-handlers'
import {finalizeAgentStreamSession} from '../finalize-agent-stream-session'
import type {AgentStreamControl, UseAgentStreamProperties} from '../use-agent-stream-types'

const createProperties = (initialMessages: ChatMessage[]) => {
  let messages = initialMessages
  let status: 'idle' | 'running' | 'done' = 'done'
  let streamError: string | null = null
  const clearResumeSessionId = vi.fn()
  const setCurrentSessionId = vi.fn()

  const properties: UseAgentStreamProperties = {
    clearResumeSessionId,
    getConversationId: () => 'conversation-id',
    getMessages: () => messages,
    getPostUrl: () => '/agent',
    getResumeSessionId: () => 'resume-session-id',
    getWorkingDirectory: () => '/workspace',
    setCurrentSessionId,
    setCurrentSessionTitle: vi.fn(),
    setMessages: (setter) => {
      messages = setter(messages)
    },
    setPromptText: vi.fn(),
    setStatus: (value) => {
      status = value
    },
    setStreamError: (value) => {
      streamError = value
    },
  }

  return {
    clearResumeSessionId,
    getMessages: () => messages,
    getStatus: () => status,
    getStreamError: () => streamError,
    properties,
    setCurrentSessionId,
  }
}

describe('finalizeAgentStreamSession', () => {
  it('should keep stale finalization from overwriting a newer run', () => {
    const controller = new AbortController()
    controller.abort()
    const activeController = new AbortController()
    const streamControl: AgentStreamControl = {
      activeController,
      runId: 2,
    }
    const sessionIdParser = {
      flush: vi.fn(),
      onStdoutChunk: vi.fn(),
    }
    const mutable: AgentStreamLoopMutable = {
      assistantMessageId: 'assistant-1',
      didConsumeStream: false,
      exitCode: null,
      exitSignalText: '',
      sessionIdParser,
      stderrOutput: '',
      stdoutJsonState: {
        accumulatedAssistant: '',
        display: '',
        lineBuffer: '',
      },
    }
    const harness = createProperties([
      {content: 'first', id: 'user-1', role: 'user'},
      {content: '', id: 'assistant-1', role: 'assistant'},
      {content: 'second', id: 'user-2', role: 'user'},
      {content: 'done', id: 'assistant-2', role: 'assistant'},
    ])

    finalizeAgentStreamSession({
      controller,
      mutable,
      properties: harness.properties,
      requestUrl: '/agent',
      runId: 1,
      streamControl,
    })

    expect(streamControl.activeController).toBe(activeController)
    expect(sessionIdParser.flush).not.toHaveBeenCalled()
    expect(harness.clearResumeSessionId).not.toHaveBeenCalled()
    expect(harness.setCurrentSessionId).not.toHaveBeenCalled()
    expect(harness.getStatus()).toBe('done')
    expect(harness.getStreamError()).toBeNull()
    expect(harness.getMessages().map((message) => message.content)).toEqual([
      'first',
      '(응답이 중단되었습니다.)',
      'second',
      'done',
    ])
  })
})
