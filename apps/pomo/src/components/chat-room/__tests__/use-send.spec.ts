/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {loadCalendarPromptContext} from 'src/features/calendar'
import {type ChatClient, type ChatRuntime, useChat} from 'src/features/chat'
import type {SpeechActivity} from 'src/features/speech-to-text'
import {useSend} from '../use-send'

vi.mock('src/features/calendar', () => ({loadCalendarPromptContext: vi.fn()}))

const setup = () => {
  const clients: Array<ChatClient> = []
  let nextId = 0
  let activity: SpeechActivity = 'idle'
  let refineAnswer = true
  const onSendStarted = vi.fn()
  const stopRecording = vi.fn(() => Promise.resolve())
  const runtime: ChatRuntime = {
    createClient: (options) => {
      const client: ChatClient = {
        dispose: vi.fn(),
        generate: vi.fn(),
        prepare: vi.fn(() => options.onResponse({type: 'ready'})),
      }
      clients.push(client)
      return client
    },
    createId: () => {
      nextId += 1
      return String(nextId)
    },
    supportsWebGpu: () => true,
  }
  const view = renderHook(() => {
    const chat = useChat({modelId: 'qwen-4b', runtime})
    const sending = useSend({
      chat,
      onSendStarted,
      refineAnswer: () => refineAnswer,
      speech: {activity: () => activity, stopRecording},
    })
    return {chat, sending}
  })
  view.result.chat.prepare()
  view.result.chat.setDraft('오늘 일정 알려줘')

  return {
    ...view,
    clients,
    onSendStarted,
    setActivity: (value: SpeechActivity) => {
      activity = value
    },
    setRefineAnswer: (value: boolean) => {
      refineAnswer = value
    },
    stopRecording,
  }
}

beforeEach(() => {
  vi.mocked(loadCalendarPromptContext).mockReset().mockResolvedValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSend', () => {
  it.each([null, '캘린더 조회 결과'])('should send with calendar context %s', async (context) => {
    vi.mocked(loadCalendarPromptContext).mockResolvedValue(context)
    const {result, clients, onSendStarted, cleanup} = setup()
    await result.sending.send()

    expect(onSendStarted).toHaveBeenCalledOnce()
    expect(loadCalendarPromptContext).toHaveBeenCalledWith({text: '오늘 일정 알려줘'})
    expect(clients[0]?.generate).toHaveBeenCalledWith(
      {messages: [{content: '오늘 일정 알려줘', id: '1', role: 'user'}], summary: ''},
      '2',
      {refineAnswer: true, ...(context === null ? {} : {supplementaryContext: context})},
    )
    cleanup()
  })

  it('should report calendar failures and send the unavailable-calendar guidance', async () => {
    const error = new Error('calendar failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(loadCalendarPromptContext).mockRejectedValue(error)
    const {result, clients, cleanup} = setup()
    await result.sending.send()

    expect(consoleError).toHaveBeenCalledWith('Failed to load calendar context for chat', error)
    expect(clients[0]?.generate).toHaveBeenCalledWith(expect.any(Object), '2', {
      refineAnswer: true,
      supplementaryContext:
        '캘린더 일정을 조회하지 못했습니다. 일정을 추측하지 말고 현재 조회할 수 없다고 안내하세요.',
    })
    cleanup()
  })

  it.each(['success', 'failure'] as const)(
    'should discard delayed calendar %s after owner disposal without recreating the client',
    async (outcome) => {
      const deferred = Promise.withResolvers<string | null>()
      vi.mocked(loadCalendarPromptContext).mockReturnValue(deferred.promise)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const {result, clients, cleanup} = setup()
      const sending = result.sending.send()
      cleanup()

      if (outcome === 'success') {
        deferred.resolve('calendar context')
      } else {
        deferred.reject(new Error('calendar failed'))
      }
      await sending

      expect(clients).toHaveLength(1)
      expect(clients[0]?.dispose).toHaveBeenCalledOnce()
      expect(clients[0]?.generate).not.toHaveBeenCalled()
      expect(result.chat.state()).toEqual({status: 'ready'})
      expect(consoleError).not.toHaveBeenCalled()
    },
  )

  it.each(['success', 'failure'] as const)(
    'should discard invalidated calendar %s and permit a later send',
    async (outcome) => {
      const deferred = Promise.withResolvers<string | null>()
      vi.mocked(loadCalendarPromptContext).mockReturnValueOnce(deferred.promise)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const {result, clients, cleanup} = setup()
      const sending = result.sending.send()
      result.sending.invalidate()

      if (outcome === 'success') {
        deferred.resolve('obsolete context')
      } else {
        deferred.reject(new Error('calendar failed'))
      }
      await sending
      expect(clients[0]?.generate).not.toHaveBeenCalled()
      expect(consoleError).not.toHaveBeenCalled()

      await result.sending.send()
      expect(clients[0]?.generate).toHaveBeenCalledOnce()
      cleanup()
    },
  )

  it('should ignore duplicate sends and read refinement settings when the query completes', async () => {
    const deferred = Promise.withResolvers<string | null>()
    vi.mocked(loadCalendarPromptContext).mockReturnValue(deferred.promise)
    const {result, clients, onSendStarted, setRefineAnswer, cleanup} = setup()
    const sending = result.sending.send()
    await result.sending.send()
    expect(onSendStarted).toHaveBeenCalledOnce()
    expect(loadCalendarPromptContext).toHaveBeenCalledOnce()
    setRefineAnswer(false)
    deferred.resolve(null)
    await sending
    expect(clients[0]?.generate).toHaveBeenCalledWith(expect.any(Object), '2', {
      refineAnswer: false,
    })
    cleanup()
  })

  it.each(['', '다른 질문'])(
    'should discard a query when the draft changes to %s',
    async (draft) => {
      const deferred = Promise.withResolvers<string | null>()
      vi.mocked(loadCalendarPromptContext).mockReturnValue(deferred.promise)
      const {result, clients, cleanup} = setup()
      const sending = result.sending.send()
      result.chat.setDraft(draft)
      deferred.resolve('obsolete context')
      await sending
      expect(clients[0]?.generate).not.toHaveBeenCalled()
      cleanup()
    },
  )

  it('should ignore sends without a sendable draft or after disposal', async () => {
    const {result, onSendStarted, cleanup} = setup()
    result.chat.setDraft('')
    await result.sending.send()
    result.chat.setDraft('오늘 일정 알려줘')
    cleanup()
    await result.sending.send()
    expect(loadCalendarPromptContext).not.toHaveBeenCalled()
    expect(onSendStarted).not.toHaveBeenCalled()
  })

  it.each(['checking', 'processing', 'requesting'] as const)(
    'should ignore sends while speech is %s',
    async (activity) => {
      const {result, setActivity, stopRecording, cleanup} = setup()
      setActivity(activity)
      await result.sending.send()
      expect(loadCalendarPromptContext).not.toHaveBeenCalled()
      expect(stopRecording).not.toHaveBeenCalled()
      cleanup()
    },
  )

  it('should wait for recording completion and send the completed transcript', async () => {
    const deferred = Promise.withResolvers<void>()
    const {result, clients, setActivity, stopRecording, cleanup} = setup()
    setActivity('recording')
    stopRecording.mockReturnValue(deferred.promise)
    const sending = result.sending.send()
    expect(loadCalendarPromptContext).not.toHaveBeenCalled()
    result.chat.setDraft('내일 일정 알려줘')
    deferred.resolve()
    await sending
    expect(loadCalendarPromptContext).toHaveBeenCalledWith({text: '내일 일정 알려줘'})
    expect(clients[0]?.generate).toHaveBeenCalledOnce()
    cleanup()
  })

  it.each(['dispose', 'invalidate'] as const)(
    'should discard a recording completion after %s',
    async (action) => {
      const deferred = Promise.withResolvers<void>()
      const {result, setActivity, stopRecording, cleanup} = setup()
      setActivity('recording')
      stopRecording.mockReturnValue(deferred.promise)
      const sending = result.sending.send()
      if (action === 'dispose') {
        cleanup()
      } else {
        result.sending.invalidate()
      }
      deferred.resolve()
      await sending
      expect(loadCalendarPromptContext).not.toHaveBeenCalled()
      if (action === 'invalidate') {
        cleanup()
      }
    },
  )

  it('should report recording failure without looking up the calendar', async () => {
    const error = new Error('recording failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const {result, setActivity, stopRecording, cleanup} = setup()
    setActivity('recording')
    stopRecording.mockRejectedValue(error)
    await result.sending.send()
    expect(consoleError).toHaveBeenCalledWith(error)
    expect(loadCalendarPromptContext).not.toHaveBeenCalled()
    cleanup()
  })
})
