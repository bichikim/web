import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ChatMessage} from '../../../components/agent/AgentChatSection'
import {submitAgentPrompt} from '../submit-agent-prompt'
import type {
  AgentStreamControl,
  UseAgentStreamProperties,
} from '../use-agent-stream-types'

const createSubmitEvent = (): Event & {currentTarget: HTMLFormElement} =>
  ({
    currentTarget: document.createElement('form'),
    preventDefault: vi.fn(),
  }) as unknown as Event & {currentTarget: HTMLFormElement}

describe('submitAgentPrompt', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should keep the draft and resume session when the agent request returns an HTTP error', async () => {
    const clearResumeSessionId = vi.fn()
    const setCurrentSessionId = vi.fn()
    const setCurrentSessionTitle = vi.fn()
    const setStreamError = vi.fn()
    const updateLastAssistantContent = vi.fn()
    const statusValues: Array<'idle' | 'running' | 'done'> = []
    let messages: ChatMessage[] = []
    let promptText = 'please run'
    const streamControl: AgentStreamControl = {
      activeController: undefined,
    }
    const properties: UseAgentStreamProperties = {
      clearResumeSessionId,
      getConversationId: () => 'conversation-id',
      getMessages: () => messages,
      getPostUrl: () => 'http://localhost:3040/agent',
      getResumeSessionId: () => 'resume-session-id',
      getWorkingDirectory: () => '/workspace',
      setCurrentSessionId,
      setCurrentSessionTitle,
      setMessages: (setter) => {
        messages = setter(messages)
      },
      setPromptText: (value) => {
        promptText = value
      },
      setStatus: (value) => {
        statusValues.push(value)
      },
      setStreamError,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({error: 'server failed'}), {status: 500})),
    )

    await submitAgentPrompt({
      event: createSubmitEvent(),
      promptText,
      properties,
      streamControl,
      updateLastAssistantContent,
    })

    expect(messages).toEqual([])
    expect(promptText).toBe('please run')
    expect(clearResumeSessionId).not.toHaveBeenCalled()
    expect(setCurrentSessionId).not.toHaveBeenCalled()
    expect(setCurrentSessionTitle).not.toHaveBeenCalled()
    expect(updateLastAssistantContent).not.toHaveBeenCalled()
    expect(setStreamError).toHaveBeenLastCalledWith('server failed')
    expect(statusValues).toEqual(['running', 'idle'])
    expect(streamControl.activeController).toBeUndefined()
  })
})
