/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {ChatController, ChatMessage} from 'src/features/chat'
import {useReplySpeech} from '../use-reply-speech'

const setup = (streaming = true) => {
  const [messages, setMessages] = createSignal<ReadonlyArray<ChatMessage>>([])
  const [answerDraft, setAnswerDraft] =
    createSignal<ReturnType<ChatController['answerDraft']>>(null)
  const [streamingText, setStreamingText] = createSignal('')
  const voice = {
    arm: vi.fn(),
    finish: vi.fn(),
    speak: vi.fn(async (_text: string) => {}),
    stop: vi.fn(),
  }
  const hook = renderHook(() =>
    useReplySpeech({
      chat: {answerDraft, messages, streamingText},
      speakBeforeRefining: () => streaming,
      voice,
    }),
  )
  return {...hook, setMessages, setAnswerDraft, voice, setStreamingText}
}

afterEach(() => vi.restoreAllMocks())

describe('useReplySpeech', () => {
  it.each([true, false])(
    'should suppress stopped replies and resume new replies (streaming: %s)',
    async (streaming) => {
      const {result, voice, setMessages, setAnswerDraft, setStreamingText} = setup(streaming)
      result.start()
      expect(voice.arm).toHaveBeenCalledOnce()
      setStreamingText('첫 문장입니다.')
      expect(voice.speak).toHaveBeenCalledTimes(streaming ? 1 : 0)
      result.stop()
      expect(voice.stop).toHaveBeenCalledOnce()
      voice.speak.mockClear()
      setStreamingText('첫 문장입니다. 다음 문장입니다. 남은 내용')
      setAnswerDraft({content: '첫 문장입니다. 다음 문장입니다. 남은 내용', id: 'old'})
      setMessages([{content: '완성된 답변', id: 'old', role: 'assistant'}])
      setStreamingText('')
      expect(voice.speak).not.toHaveBeenCalled()
      expect(voice.finish).not.toHaveBeenCalled()

      result.start()
      setMessages([{content: '새 질문', id: 'user', role: 'user'}])
      setAnswerDraft(null)
      setStreamingText('')
      expect(voice.speak).not.toHaveBeenCalled()
      setStreamingText('새 답변입니다.')
      setAnswerDraft({content: '새 답변입니다.', id: 'new'})
      setMessages([{content: '새 답변입니다.', id: 'new', role: 'assistant'}])
      expect(voice.speak).toHaveBeenCalledExactlyOnceWith('새 답변입니다.')
      expect(voice.finish).toHaveBeenCalledOnce()
    },
  )

  it('should speak completed sentences and flush the remaining tail once', () => {
    const {result, voice, setAnswerDraft, setStreamingText} = setup()
    result.start()
    setStreamingText('첫 문장입니다. 남은 내용')
    expect(voice.speak).toHaveBeenCalledExactlyOnceWith('첫 문장입니다.')
    setAnswerDraft({content: '첫 문장입니다. 남은 내용', id: 'reply'})
    expect(voice.speak).toHaveBeenLastCalledWith('남은 내용')
    setAnswerDraft({content: '다듬어진 내용', id: 'reply'})
    expect(voice.speak).toHaveBeenCalledTimes(2)
    expect(voice.finish).toHaveBeenCalledOnce()
  })

  it.each(['최종 답변', ''])('should flush a final draft without streamed text: %s', (content) => {
    const {result, voice, setAnswerDraft} = setup()
    result.start()
    setAnswerDraft({content, id: 'reply'})
    expect(voice.speak).toHaveBeenCalledTimes(content.length > 0 ? 1 : 0)
    expect(voice.finish).toHaveBeenCalledOnce()
  })

  it('should speak each completed assistant once and ignore user messages', () => {
    const {voice, setMessages} = setup(false)
    setMessages([{content: '질문', id: 'user', role: 'user'}])
    expect(voice.speak).not.toHaveBeenCalled()
    setMessages([{content: '답변', id: 'reply', role: 'assistant'}])
    setMessages([{content: '답변', id: 'reply', role: 'assistant'}])
    expect(voice.speak).toHaveBeenCalledExactlyOnceWith('답변')
    expect(voice.finish).toHaveBeenCalledOnce()
  })

  it('should reset the buffer and stop observing after disposal', () => {
    const {result, cleanup, voice, setStreamingText} = setup()
    result.start()
    setStreamingText('첫 문장입니다.')
    result.reset()
    expect(voice.stop).toHaveBeenCalledOnce()
    setStreamingText('첫 문장입니다. 다음 문장입니다.')
    expect(voice.speak).toHaveBeenCalledTimes(3)
    cleanup()
    setStreamingText('다른 문장입니다.')
    expect(voice.speak).toHaveBeenCalledTimes(3)
  })

  it('should report rejected speech requests', async () => {
    const {result, voice, setStreamingText} = setup()
    const error = new Error('speech failed')
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    voice.speak.mockRejectedValueOnce(error)
    result.start()
    setStreamingText('첫 문장입니다.')
    await vi.waitFor(() => expect(report).toHaveBeenCalledWith(error))
  })
})
