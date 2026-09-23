/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {ChatController, ChatMessage} from 'src/features/chat'
import {useReplySpeech} from '../components/chat-room/use-reply-speech'

it('should speak the refined assistant message after draft streaming finishes', () => {
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
  const {result} = renderHook(() =>
    useReplySpeech({
      chat: {answerDraft, messages, streamingText},
      speakBeforeRefining: () => true,
      voice,
    }),
  )

  result.start()
  setStreamingText('초안 답변입니다.')
  setAnswerDraft({content: '초안 답변입니다.', id: 'draft-1'})

  expect(voice.speak).toHaveBeenCalledExactlyOnceWith('초안 답변입니다.')
  expect(voice.finish).toHaveBeenCalledOnce()

  voice.speak.mockClear()
  voice.finish.mockClear()

  setAnswerDraft(null)
  setStreamingText('')
  setMessages([{content: '다듬어진 최종 답변입니다.', id: 'assistant-1', role: 'assistant'}])

  expect(voice.speak).toHaveBeenCalledExactlyOnceWith('다듬어진 최종 답변입니다.')
  expect(voice.finish).toHaveBeenCalledOnce()
})
