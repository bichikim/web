/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {type ChatClient, type ChatRuntime, useChat} from 'src/features/chat'
import type {SpeechActivity} from 'src/features/speech-to-text'
import {useSend} from '../use-send'

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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSend', () => {
  it('should enable the calendar tool for the model and ignore duplicate sends', async () => {
    const {result, clients, onSendStarted, setRefineAnswer, cleanup} = setup()
    setRefineAnswer(false)
    await Promise.all([result.sending.send(), result.sending.send()])

    expect(onSendStarted).toHaveBeenCalledOnce()
    expect(clients[0]?.generate).toHaveBeenCalledExactlyOnceWith(
      {messages: [{content: '오늘 일정 알려줘', id: '1', role: 'user'}], summary: ''},
      '2',
      {calendarTool: {now: expect.any(String), timeZone: expect.any(String)}, refineAnswer: false},
    )
    cleanup()
  })

  it('should ignore sends without a sendable draft or after disposal', async () => {
    const {result, clients, onSendStarted, cleanup} = setup()
    result.chat.setDraft('')
    await result.sending.send()
    result.chat.setDraft('오늘 일정 알려줘')
    cleanup()
    await result.sending.send()
    expect(clients[0]?.generate).not.toHaveBeenCalled()
    expect(onSendStarted).not.toHaveBeenCalled()
  })

  it.each(['checking', 'processing', 'requesting'] as const)(
    'should ignore sends while speech is %s',
    async (activity) => {
      const {result, clients, setActivity, stopRecording, cleanup} = setup()
      setActivity(activity)
      await result.sending.send()
      expect(clients[0]?.generate).not.toHaveBeenCalled()
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
    expect(clients[0]?.generate).not.toHaveBeenCalled()
    result.chat.setDraft('내일 일정 알려줘')
    deferred.resolve()
    await sending
    expect(clients[0]?.generate).toHaveBeenCalledExactlyOnceWith(
      {messages: [{content: '내일 일정 알려줘', id: '1', role: 'user'}], summary: ''},
      '2',
      expect.objectContaining({refineAnswer: true}),
    )
    cleanup()
  })

  it.each(['dispose', 'invalidate'] as const)(
    'should discard a recording completion after %s',
    async (action) => {
      const deferred = Promise.withResolvers<void>()
      const {result, clients, setActivity, stopRecording, cleanup} = setup()
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
      expect(clients[0]?.generate).not.toHaveBeenCalled()
      if (action === 'invalidate') {
        cleanup()
      }
    },
  )

  it('should report recording failure without sending the message', async () => {
    const error = new Error('recording failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const {result, clients, setActivity, stopRecording, cleanup} = setup()
    setActivity('recording')
    stopRecording.mockRejectedValue(error)
    await result.sending.send()
    expect(consoleError).toHaveBeenCalledWith(error)
    expect(clients[0]?.generate).not.toHaveBeenCalled()
    cleanup()
  })
})
