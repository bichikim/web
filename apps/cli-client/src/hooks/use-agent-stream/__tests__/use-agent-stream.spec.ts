import {afterEach, describe, expect, it, vi} from 'vitest'

import type {ChatMessage} from '@/components/agent/AgentChatSection'
import {useAgentStream} from '@/hooks/use-agent-stream/use-agent-stream'

const createSubmitEvent = (): Event & {currentTarget: HTMLFormElement} => {
  const form = document.createElement('form')
  const event = new Event('submit') as Event & {currentTarget: HTMLFormElement}

  Object.defineProperty(event, 'currentTarget', {
    value: form,
  })

  return event
}

const createSseResponse = (blocks: readonly string[]): Response => {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const block of blocks) {
          controller.enqueue(encoder.encode(block))
        }

        controller.close()
      },
    }),
    {status: 200},
  )
}

const createErroredSseResponse = (): Response => {
  const encoder = new TextEncoder()
  let didEnqueue = false

  return new Response(
    new ReadableStream({
      pull(controller) {
        if (didEnqueue) {
          controller.error(new Error('stream failed'))
          return
        }

        controller.enqueue(
          encoder.encode('event: stdout\ndata: {"type":"assistant","message":{"content":[{"type":"text","text":"partial"}]}}\n\n'),
        )
        didEnqueue = true
      },
    }),
    {status: 200},
  )
}

const createHookHarness = () => {
  let messages: ChatMessage[] = []
  let promptText = 'keep me'
  let status: 'idle' | 'running' | 'done' = 'idle'
  let streamError: string | null = null
  let currentSessionId: string | null = null
  let currentSessionTitle: string | null = null
  const clearResumeSessionId = vi.fn()

  const hook = useAgentStream({
    getPostUrl: () => '/agent',
    getWorkingDirectory: () => '/workspace',
    getConversationId: () => 'conversation-id',
    getResumeSessionId: () => 'resume-session-id',
    clearResumeSessionId,
    getMessages: () => messages,
    setMessages: (setter) => {
      messages = setter(messages)
    },
    setPromptText: (value) => {
      promptText = value
    },
    setStatus: (value) => {
      status = value
    },
    setStreamError: (value) => {
      streamError = value
    },
    setCurrentSessionId: (value) => {
      currentSessionId = value
    },
    setCurrentSessionTitle: (value) => {
      currentSessionTitle = value
    },
  })

  return {
    clearResumeSessionId,
    getCurrentSessionId: () => currentSessionId,
    getCurrentSessionTitle: () => currentSessionTitle,
    getMessages: () => messages,
    getPromptText: () => promptText,
    getStatus: () => status,
    getStreamError: () => streamError,
    submitPrompt: hook.submitPrompt,
  }
}

describe('useAgentStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should keep a failed HTTP response idle without clearing the resume session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({error: 'server down'}), {
          status: 500,
        }),
      ),
    )
    const harness = createHookHarness()

    await harness.submitPrompt({event: createSubmitEvent(), promptText: 'hello'})

    expect(harness.getStatus()).toBe('idle')
    expect(harness.getStreamError()).toBe('server down')
    expect(harness.clearResumeSessionId).not.toHaveBeenCalled()
    expect(harness.getPromptText()).toBe('')
    expect(harness.getMessages()).toHaveLength(2)
  })

  it('should keep a stream read failure idle without clearing the resume session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createErroredSseResponse()))
    const harness = createHookHarness()

    await harness.submitPrompt({event: createSubmitEvent(), promptText: 'hello'})

    expect(harness.getStatus()).toBe('idle')
    expect(harness.getStreamError()).toBe('stream failed')
    expect(harness.clearResumeSessionId).not.toHaveBeenCalled()
    expect(harness.getMessages().at(-1)?.content).toBe('partial')
  })

  it('should clear the resume session only after consuming a successful stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createSseResponse([
          'event: stdout\ndata: {"type":"assistant","message":{"content":[{"type":"text","text":"done"}]}}\n\n',
        ]),
      ),
    )
    const harness = createHookHarness()

    await harness.submitPrompt({event: createSubmitEvent(), promptText: 'hello'})

    expect(harness.getStatus()).toBe('done')
    expect(harness.getStreamError()).toBeNull()
    expect(harness.clearResumeSessionId).toHaveBeenCalledTimes(1)
    expect(harness.getMessages().at(-1)?.content).toBe('done')
  })
})
