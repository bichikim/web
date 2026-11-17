/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import type {Wllama} from '@wllama/wllama/esm/index.js'
import {describe, expect, it, vi} from 'vitest'
import {type ChatRuntime, type ChatWorkerResponse, useChat} from 'src/features/chat'
import {generateGgufText} from 'src/features/text-generation/generate-gguf-text'
import {useReplySpeech} from '../use-reply-speech'

const setup = (streaming: boolean) => {
  let respond: (response: ChatWorkerResponse) => void = () => {
    throw new Error('Chat client has not been prepared.')
  }
  let nextId = 0
  const runtime: ChatRuntime = {
    createClient: (options) => {
      respond = options.onResponse
      return {
        dispose: vi.fn(),
        generate: vi.fn(),
        prepare: () => respond({type: 'ready'}),
      }
    },
    createId: () => {
      nextId += 1
      return String(nextId)
    },
    supportsWebGpu: () => false,
  }
  const voice = {
    arm: vi.fn(),
    finish: vi.fn(),
    speak: vi.fn(async (_text: string) => {}),
    stop: vi.fn(),
  }
  const hook = renderHook(() => {
    const chat = useChat({modelId: 'lfm-2.6b-qad', runtime})
    const speech = useReplySpeech({chat, speakBeforeRefining: () => streaming, voice})
    return {chat, speech}
  })
  hook.result.chat.prepare()
  hook.result.chat.setDraft('Give an example.')
  hook.result.speech.start()
  hook.result.chat.send({refineAnswer: false})

  const complete = (text: string) => {
    const message = {content: text, id: '2', role: 'assistant'} as const
    const context = {
      messages: [...hook.result.chat.messages(), message],
      summary: '',
    }
    respond({context, contextTokens: 12, message, type: 'complete', wasCompacted: false})
  }
  return {...hook, complete, respond: (response: ChatWorkerResponse) => respond(response), voice}
}

describe('useReplySpeech with accumulated chat tokens', () => {
  it.each([
    ['Examples include e.g. apples and pears.', true],
    ['Use a fruit, i.e. an apple.', true],
    ['The meeting is at 3 p.m. today.', true],
    ['Choose an option e.g. apples and pears.', true],
    ['Read the section i.e. the introduction.', true],
    ['Examples include e.g. apples and pears.', false],
  ] as const)(
    'should consume character deltas without splitting dotted abbreviations (%s, streaming: %s)',
    async (sentence, streaming) => {
      const {result, respond, complete, voice, cleanup} = setup(streaming)
      const text = `${sentence} Next step.`
      const model = {
        createChatCompletion: vi.fn(async ({onData}) => {
          let prefix = ''
          for (const character of text) {
            prefix += character
            onData({choices: [{delta: {content: character}}]})
            expect(result.chat.streamingText()).toBe(prefix)
          }
        }),
      } as unknown as Wllama

      const generated = await generateGgufText({
        model,
        options: {
          maximumTokens: 2048,
          messages: [{content: 'Give an example.', role: 'user'}],
          noRepeatNgramSize: 4,
          onToken: (token) => respond({text: token, type: 'token'}),
          repetitionPenalty: 1.1,
          temperature: 0.65,
          topK: 40,
          topP: 0.9,
        },
      })
      expect(generated).toBe(text)
      expect(voice.speak.mock.calls.map(([spoken]) => spoken)).toEqual(
        streaming ? [sentence, 'Next step.'] : [],
      )
      respond({draft: {content: generated, id: '2'}, type: 'draft'})
      complete(generated)
      expect(voice.speak.mock.calls.map(([spoken]) => spoken)).toEqual(
        streaming ? [sentence, 'Next step.'] : [text],
      )
      expect(voice.finish).toHaveBeenCalledOnce()
      expect(result.chat.messages().at(-1)?.content).toBe(text)
      cleanup()
    },
  )

  it('should flush a genuine lowercase ending once when the draft completes', () => {
    const {respond, complete, voice, cleanup} = setup(true)
    const text = 'Read e.'

    respond({text, type: 'token'})
    expect(voice.speak).not.toHaveBeenCalled()
    respond({draft: {content: text, id: '2'}, type: 'draft'})
    complete(text)
    expect(voice.speak).toHaveBeenCalledExactlyOnceWith(text)
    expect(voice.finish).toHaveBeenCalledOnce()
    cleanup()
  })

  it.each([true, false])('should speak a complete-only reply once (streaming: %s)', (streaming) => {
    const {complete, voice, cleanup} = setup(streaming)
    const text = 'Examples include e.g. apples and pears. Next step.'

    complete(text)
    expect(voice.speak).toHaveBeenCalledExactlyOnceWith(text)
    expect(voice.finish).toHaveBeenCalledOnce()
    cleanup()
  })
})
