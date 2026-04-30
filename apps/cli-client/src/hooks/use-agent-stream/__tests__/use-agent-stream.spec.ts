import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {ChatMessage} from '@/components/agent/AgentChatSection'
import {postAgentSseStream} from '@/hooks/use-agent-stream/agent-stream'
import {useAgentStream} from '@/hooks/use-agent-stream/use-agent-stream'

vi.mock('@/hooks/use-agent-stream/agent-stream', () => ({
  postAgentSseStream: vi.fn(),
}))

const postAgentSseStreamMock = vi.mocked(postAgentSseStream)

const createSubmitEvent = (): Event & {currentTarget: HTMLFormElement} =>
  ({
    currentTarget: document.createElement('form'),
    preventDefault: vi.fn(),
  }) as unknown as Event & {currentTarget: HTMLFormElement}

const createProperties = () => {
  let messages: ChatMessage[] = []
  let promptText = 'hello'
  let streamError: string | null = null
  let currentSessionId: string | null = 'session-before'
  let currentSessionTitle: string | null = null
  let status: 'idle' | 'running' | 'done' = 'idle'
  const statusHistory: Array<'idle' | 'running' | 'done'> = []
  const clearResumeSessionId = vi.fn()

  const properties = {
    getConversationId: () => 'conversation-1',
    getMessages: () => messages,
    getPostUrl: () => 'http://localhost:3040/agent',
    getResumeSessionId: () => 'resume-1',
    getWorkingDirectory: () => '/',
    clearResumeSessionId,
    setCurrentSessionId: (value: string | null) => {
      currentSessionId = value
    },
    setCurrentSessionTitle: (value: string | null) => {
      currentSessionTitle = value
    },
    setMessages: (setter: (previous: ChatMessage[]) => ChatMessage[]) => {
      messages = setter(messages)
    },
    setPromptText: (value: string) => {
      promptText = value
    },
    setStatus: (value: 'idle' | 'running' | 'done') => {
      status = value
      statusHistory.push(value)
    },
    setStreamError: (value: string | null) => {
      streamError = value
    },
  }

  return {
    get currentSessionId() {
      return currentSessionId
    },
    get currentSessionTitle() {
      return currentSessionTitle
    },
    get messages() {
      return messages
    },
    get promptText() {
      return promptText
    },
    get status() {
      return status
    },
    get streamError() {
      return streamError
    },
    clearResumeSessionId,
    properties,
    statusHistory,
  }
}

describe('useAgentStream', () => {
  beforeEach(() => {
    postAgentSseStreamMock.mockReset()
  })

  it('should keep resume session state when the request fails before streaming', async () => {
    postAgentSseStreamMock.mockImplementation(async (arguments_) => {
      await arguments_.createHandlers()

      return {
        response: new Response(JSON.stringify({error: 'server exploded'}), {status: 500}),
        status: 'http-error',
      }
    })

    const context = createProperties()
    const {submitPrompt} = useAgentStream(context.properties)

    await submitPrompt({event: createSubmitEvent(), promptText: 'hello'})

    expect(context.clearResumeSessionId).not.toHaveBeenCalled()
    expect(context.status).toBe('idle')
    expect(context.statusHistory).toEqual(['running', 'idle'])
    expect(context.streamError).toBe('server exploded')
  })

  it('should clear resume session state after the stream is consumed successfully', async () => {
    postAgentSseStreamMock.mockImplementation(async (arguments_) => {
      const handlers = await arguments_.createHandlers()

      handlers.onStdout('{"session_id":"session-next"}\n')
      handlers.onStdout('{"type":"result","result":"done"}\n')
      handlers.onExit({code: 0, signal: null})

      return {status: 'consumed'}
    })

    const context = createProperties()
    const {submitPrompt} = useAgentStream(context.properties)

    await submitPrompt({event: createSubmitEvent(), promptText: 'hello'})

    expect(context.clearResumeSessionId).toHaveBeenCalledTimes(1)
    expect(context.currentSessionId).toBe('session-next')
    expect(context.messages.at(-1)?.content).toBe('done')
    expect(context.status).toBe('done')
  })
})
