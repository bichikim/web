import {cx} from 'class-variance-authority'
import {createEffect, createSignal} from 'solid-js'

import {useChat} from '../features/chat'
import {createStreamingSpeechBuffer, useChatVoice} from '../features/chat-voice'
import {appendSpeechTranscript, useSpeechToText} from '../features/speech-to-text'
import {getTextModel, type TextModelId} from '../features/text-generation'
import {ChatComposer} from './chat-room/Composer'
import {ChatHeader} from './chat-room/Header'
import {ChatTranscript} from './chat-room/Transcript'
import {ContextSidebar} from './chat-room/ContextSidebar'
import {MAXIMUM_DRAFT_LENGTH} from './chat-room/shared'
const PANEL_CLASSES = cx(
  'overflow-hidden rounded-8 border border-white/10 bg-#211a2b/88',
  'shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.45)] backdrop-blur-xl',
)

const ChatRoom = () => {
  const chat = useChat({modelId: 'qwen-4b'})
  const model = () => getTextModel(chat.modelId())
  const voice = useChatVoice()
  const speechBuffer = createStreamingSpeechBuffer({locale: 'ko'})
  const [messageList, setMessageList] = createSignal<HTMLDivElement>()
  const [disableRefining, setDisableRefining] = createSignal(false)
  const [endpointing, setEndpointing] = createSignal(false)
  const [speakBeforeRefining, setSpeakBeforeRefining] = createSignal(false)
  let spokenMessageId: string | null = null
  let speakDraftForReply = false

  const speech = useSpeechToText({
    accumulateText: false,
    endpointing,
    modelId: 'whisper-base',
    onTranscript: (transcript) => {
      const currentDraft = chat.draft()
      chat.setDraft(appendSpeechTranscript(currentDraft, transcript).slice(0, MAXIMUM_DRAFT_LENGTH))
    },
  })

  const sendDraft = () => {
    if (!chat.canSend()) {
      return
    }

    voice.arm()
    speechBuffer.reset()
    speakDraftForReply = speakBeforeRefining()
    chat.send({refineAnswer: !disableRefining()})
  }
  const stopSpeechAndSend = () => {
    speech.stopRecording().then(sendDraft).catch(console.error)
  }
  const handleSend = () => {
    const speechActivity = speech.activity()

    if (speechActivity === 'recording') {
      stopSpeechAndSend()
      return
    }

    if (speechActivity === 'idle') {
      sendDraft()
    }
  }
  const handlePrepare = () => {
    chat.prepare()
    voice.prepare().catch(console.error)
  }
  const handleModelChange = (modelId: TextModelId) => {
    voice.stop()
    speechBuffer.reset()
    chat.selectModel(modelId)
  }
  const handleClear = () => {
    voice.stop()
    chat.clear()
  }
  const handleSpeechToggle = () => {
    const isRecording = speech.activity() === 'recording'
    voice.stop()

    if (isRecording) {
      speech.stopRecording().catch(console.error)
      return
    }

    speech.startRecording().catch(console.error)
  }

  createEffect(() => {
    const messages = chat.messages()
    const answerDraft = chat.answerDraft()
    const streamingText = chat.streamingText()
    const element = messageList()
    queueMicrotask(() => {
      element?.scrollTo({behavior: 'smooth', top: element.scrollHeight})
    })

    const latestMessage = messages.at(-1)

    if (speakDraftForReply) {
      for (const sentence of speechBuffer.update(streamingText)) {
        voice.speak(sentence).catch(console.error)
      }

      if (answerDraft !== null && answerDraft.id !== spokenMessageId) {
        const remainingText = speechBuffer.flush(
          streamingText.length > 0 ? streamingText : answerDraft.content,
        )

        if (remainingText !== null) {
          voice.speak(remainingText).catch(console.error)
        }

        voice.finish()
        spokenMessageId = answerDraft.id
      }

      return
    }

    if (latestMessage?.role === 'assistant' && latestMessage.id !== spokenMessageId) {
      spokenMessageId = latestMessage.id
      voice.speak(latestMessage.content).catch(console.error)
      voice.finish()
    }
  })

  return (
    <section class={PANEL_CLASSES}>
      <ChatHeader
        disabled={chat.isBusy() || speech.activity() !== 'idle'}
        modelId={model().id}
        onModelChange={handleModelChange}
      />

      <div class="grid min-h-[68dvh] 2xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div class="grid min-h-0 grid-rows-[1fr_auto]">
          <ChatTranscript chat={chat} setMessageList={setMessageList} voice={voice} />
          <ChatComposer
            chat={chat}
            endpointing={endpointing()}
            onEndpointingChange={setEndpointing}
            onSend={handleSend}
            onSpeechToggle={handleSpeechToggle}
            speech={speech}
          />
        </div>
        <ContextSidebar
          chat={chat}
          disableRefining={disableRefining()}
          modelLabel={model().label}
          onClear={handleClear}
          onDisableRefiningChange={setDisableRefining}
          onPrepare={handlePrepare}
          onSpeakBeforeRefiningChange={setSpeakBeforeRefining}
          speakBeforeRefining={speakBeforeRefining()}
          voice={voice}
        />
      </div>
    </section>
  )
}

export default ChatRoom
