import {type Accessor, createEffect} from 'solid-js'

import type {ChatController} from 'src/features/chat'
import {type ChatVoiceController, createStreamingSpeechBuffer} from 'src/features/chat-voice'

export interface UseReplySpeechProps {
  readonly chat: Pick<ChatController, 'messages' | 'answerDraft' | 'streamingText'>
  readonly voice: Pick<ChatVoiceController, 'arm' | 'stop' | 'speak' | 'finish'>
  readonly speakBeforeRefining: Accessor<boolean>
}

/** Coordinates automatic reply speech and suppresses stopped replies until the next send. */
export const useReplySpeech = (props: UseReplySpeechProps) => {
  const speechBuffer = createStreamingSpeechBuffer({locale: 'ko'})
  let handledMessageId: string | null = null
  let messageCountAtStart = 0
  let streamedReplyText: string | null = null
  let replySpeech: 'streaming' | 'completed' | 'stopped' = 'completed'

  const start = () => {
    props.voice.arm()
    speechBuffer.reset()
    messageCountAtStart = props.chat.messages().length
    streamedReplyText = null
    replySpeech = props.speakBeforeRefining() ? 'streaming' : 'completed'
  }
  const stop = () => {
    replySpeech = 'stopped'
    props.voice.stop()
  }
  const reset = () => {
    props.voice.stop()
    speechBuffer.reset()
  }

  createEffect(() => {
    const messages = props.chat.messages()
    const answerDraft = props.chat.answerDraft()
    const streamingText = props.chat.streamingText()
    const latestMessage = messages.at(-1)

    if (replySpeech === 'stopped') {
      handledMessageId = answerDraft?.id ?? latestMessage?.id ?? null
      return
    }

    if (replySpeech === 'streaming') {
      for (const sentence of speechBuffer.update(streamingText)) {
        props.voice.speak(sentence).catch(console.error)
      }

      if (answerDraft !== null && answerDraft.id !== handledMessageId) {
        streamedReplyText = streamingText.length > 0 ? streamingText : answerDraft.content
        const remainingText = speechBuffer.flush(streamedReplyText)

        if (remainingText !== null) {
          props.voice.speak(remainingText).catch(console.error)
        }

        props.voice.finish()
        handledMessageId = answerDraft.id
      }

      if (
        answerDraft === null &&
        messages.length > messageCountAtStart &&
        latestMessage?.role === 'assistant'
      ) {
        handledMessageId = latestMessage.id
        replySpeech = 'completed'

        if (latestMessage.content !== streamedReplyText) {
          props.voice.arm()
          props.voice.speak(latestMessage.content).catch(console.error)
          props.voice.finish()
        }
      }

      return
    }

    if (latestMessage?.role === 'assistant' && latestMessage.id !== handledMessageId) {
      handledMessageId = latestMessage.id
      props.voice.speak(latestMessage.content).catch(console.error)
      props.voice.finish()
    }
  })

  return {reset, start, stop}
}
