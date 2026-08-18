import {cx} from 'class-variance-authority'
import {createEffect, createSignal, For, Show} from 'solid-js'

import {type ChatController, type ChatMessage, useChat} from '../features/chat'
import {PSelect, type PSelectOption} from '../design-system/PSelect'
import {
  type ChatVoiceController,
  createStreamingSpeechBuffer,
  useChatVoice,
} from '../features/chat-voice'
import {useKoreanTextSegments} from '../features/korean-text-postprocessor'
import {
  appendSpeechTranscript,
  type SpeechToTextController,
  useSpeechToText,
} from '../features/speech-to-text'
import {getTextModel, TEXT_MODELS, type TextModelId} from '../features/text-generation'
import {KoreanTextRenderer} from './KoreanTextRenderer'

const MAXIMUM_DRAFT_LENGTH = 1200
const COMPACTION_THRESHOLD = 4608
const PANEL_CLASSES = cx(
  'overflow-hidden rounded-8 border border-white/10 bg-#211a2b/88',
  'shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl',
)
const BUTTON_CLASSES = cx(
  'h-11 rounded-full px-5 text-sm font-700 transition',
  'disabled:cursor-not-allowed disabled:opacity-35',
)
const MODEL_OPTIONS: ReadonlyArray<PSelectOption<TextModelId>> = TEXT_MODELS.map((model) => ({
  label: `${model.label} · ${model.downloadSize}`,
  value: model.id,
}))

interface ChatBubbleProps {
  readonly isVoiceGenerating: boolean
  readonly message: ChatMessage
}

interface ProcessedKoreanTextProps {
  readonly text: string
}

const ProcessedKoreanText = (props: ProcessedKoreanTextProps) => {
  const segments = useKoreanTextSegments({text: () => props.text})

  return <KoreanTextRenderer segments={segments()} />
}

const ChatBubble = (props: ChatBubbleProps) => (
  <article
    class={cx(
      'max-w-[86%] whitespace-pre-wrap rounded-6 px-4 py-3 text-[15px] leading-7 sm:max-w-[76%]',
      props.message.role === 'user'
        ? 'ml-auto rounded-br-2 bg-#9ed6bb text-#13231c'
        : 'mr-auto rounded-bl-2 bg-white/7 text-#eee5ef',
    )}
  >
    <span class="sr-only">{props.message.role === 'user' ? '나' : '모델'}: </span>
    <Show fallback={props.message.content} when={props.message.role === 'assistant'}>
      <ProcessedKoreanText text={props.message.content} />
      <Show when={props.isVoiceGenerating}>
        <span
          aria-hidden="true"
          class={cx(
            'ml-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2',
            'border-#9ed6bb/30 border-t-#9ed6bb align-middle',
          )}
        />
        <span class="sr-only">답변 음성 생성 중</span>
      </Show>
    </Show>
  </article>
)

interface ChatHeaderProps {
  readonly disabled: boolean
  readonly modelId: TextModelId
  readonly onModelChange: (modelId: TextModelId) => void
}

const ChatHeader = (props: ChatHeaderProps) => (
  <header
    class={cx(
      'flex flex-col gap-5 border-b border-white/8 px-5 py-5',
      'sm:flex-row sm:items-start sm:justify-between sm:px-7',
    )}
  >
    <div>
      <p class="m-0 text-xs font-700 tracking-[0.24em] text-#9ed6bb uppercase">
        Private on-device chat
      </p>
      <h1 class="mb-0 mt-2 text-2xl font-780 tracking--0.025em sm:text-3xl">
        로컬 모델과 이어서 대화해요
      </h1>
      <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
        오래된 대화는 중요한 기억만 남기고 자동으로 압축해요.
      </p>
    </div>
    <div class="w-full shrink-0 sm:w-64">
      <PSelect
        disabled={props.disabled}
        hideLabel
        label="채팅 모델"
        onChange={props.onModelChange}
        options={MODEL_OPTIONS}
        value={props.modelId}
      />
    </div>
  </header>
)

interface ChatTranscriptProps {
  readonly chat: ChatController
  readonly setMessageList: (element: HTMLDivElement) => void
  readonly voice: ChatVoiceController
}

const ChatTranscript = (props: ChatTranscriptProps) => {
  const voiceMessageId = () => {
    if (!props.voice.isGenerating()) {
      return null
    }

    return props.chat.messages().at(-1)?.id ?? null
  }

  return (
    <div
      aria-live="polite"
      class="max-h-[58dvh] min-h-96 overflow-y-auto px-5 py-6 sm:px-7"
      ref={props.setMessageList}
    >
      <Show
        fallback={
          <div class="grid h-full min-h-80 place-items-center text-center">
            <div class="max-w-sm">
              <div
                class={cx(
                  'mx-auto grid h-14 w-14 place-items-center rounded-full bg-#9ed6bb/12',
                  'text-lg font-800 text-#b8e8d0',
                )}
              >
                Q
              </div>
              <h2 class="mb-0 mt-5 text-xl font-720">새 대화를 시작해 보세요</h2>
              <p class="mb-0 mt-2 text-sm leading-6 text-#918697">
                예를 들어 이름이나 취향을 알려 준 뒤, 몇 차례 대화하고 다시 물어볼 수 있어요.
              </p>
            </div>
          </div>
        }
        when={props.chat.messages().length > 0}
      >
        <div class="grid content-end gap-4">
          <For each={props.chat.messages()}>
            {(message) => (
              <ChatBubble isVoiceGenerating={message.id === voiceMessageId()} message={message} />
            )}
          </For>
          <Show when={props.chat.streamingText().length > 0 || props.chat.isBusy()}>
            <article
              class={cx(
                'mr-auto max-w-[86%] whitespace-pre-wrap rounded-6 rounded-bl-2 bg-white/7',
                'px-4 py-3 text-[15px] leading-7 text-#eee5ef sm:max-w-[76%]',
              )}
            >
              <ProcessedKoreanText text={props.chat.streamingText()} />
              <span
                aria-hidden="true"
                class="ml-1 inline-block h-4 w-0.5 animate-pulse bg-#9ed6bb"
              />
              <span class="sr-only">답변 작성 중</span>
              <Show when={props.voice.isGenerating()}>
                <span
                  aria-hidden="true"
                  class={cx(
                    'ml-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2',
                    'border-#9ed6bb/30 border-t-#9ed6bb align-middle',
                  )}
                />
                <span class="sr-only">답변 음성 생성 중</span>
              </Show>
            </article>
          </Show>
        </div>
      </Show>
    </div>
  )
}

interface ChatComposerProps {
  readonly chat: ChatController
  readonly endpointing: boolean
  readonly onEndpointingChange: (enabled: boolean) => void
  readonly onSend: () => void
  readonly onSpeechToggle: () => void
  readonly speech: SpeechToTextController
}

const ChatComposer = (props: ChatComposerProps) => {
  const isSpeechBusy = () => {
    const activity = props.speech.activity()
    return activity === 'checking' || activity === 'processing' || activity === 'requesting'
  }
  const isRecording = () => props.speech.activity() === 'recording'
  const microphoneLabel = () => {
    if (isRecording()) {
      return '마이크 끄기'
    }

    return isSpeechBusy() ? '음성 처리 중…' : '음성 입력'
  }
  const sendButtonLabel = () => (isRecording() ? '마이크 끄고 보내기' : '보내기')
  const handleDraftInput = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => {
    props.chat.setDraft(event.currentTarget.value)
  }
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    props.onSend()
  }
  const handleDraftKeyDown = (event: KeyboardEvent & {currentTarget: HTMLTextAreaElement}) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      props.onSend()
    }
  }

  return (
    <form class="border-t border-white/8 p-4 sm:p-5" onSubmit={handleSubmit}>
      <label class="grid gap-2">
        <span class="sr-only">메시지</span>
        <textarea
          class={cx(
            'min-h-24 w-full resize-none box-border rounded-5 border border-white/10 bg-#17131f p-4',
            'text-[15px] leading-6 text-#f8edf1 outline-none transition placeholder:text-#655b6c',
            'focus:border-#9ed6bb/65 disabled:cursor-not-allowed disabled:opacity-50',
          )}
          disabled={!props.chat.isModelReady() || props.chat.isBusy()}
          maxlength={MAXIMUM_DRAFT_LENGTH}
          onInput={handleDraftInput}
          onKeyDown={handleDraftKeyDown}
          placeholder={
            !props.chat.isModelReady() || props.chat.isBusy()
              ? '먼저 모델을 준비해 주세요'
              : '메시지를 입력하세요'
          }
          value={props.chat.draft()}
        />
      </label>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-#8f8297">Enter 전송 · Shift+Enter 줄바꿈</span>
          <button
            aria-pressed={props.endpointing}
            class={cx(
              'rounded-full border px-3 py-1 text-[11px] font-700 transition',
              'disabled:cursor-not-allowed disabled:opacity-40',
              props.endpointing
                ? 'border-#9ed6bb/40 bg-#9ed6bb/12 text-#b8e8d0'
                : 'border-white/10 bg-white/4 text-#918697 hover:bg-white/8',
            )}
            disabled={isRecording() || isSpeechBusy()}
            onClick={() => props.onEndpointingChange(!props.endpointing)}
            type="button"
          >
            말끝 감지 후 바로 입력 · {props.endpointing ? '켬' : '끔'}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button
            aria-pressed={isRecording()}
            class={cx(
              BUTTON_CLASSES,
              'border border-white/10 bg-white/5 text-#d9cfdd hover:bg-white/9',
              isRecording() && 'border-#ff8e9e/35 bg-#ff8e9e/12 text-#ffb0bb',
            )}
            disabled={isSpeechBusy() || props.speech.isSupported() !== true}
            onClick={() => props.onSpeechToggle()}
            type="button"
          >
            {microphoneLabel()}
          </button>
          <button
            class={cx(BUTTON_CLASSES, 'bg-#9ed6bb text-#14251d hover:bg-#b8e8d0')}
            disabled={!isRecording() && (!props.chat.canSend() || isSpeechBusy())}
            type="submit"
          >
            {sendButtonLabel()}
          </button>
        </div>
      </div>
      <Show when={isRecording()}>
        <p aria-live="polite" class="mb-0 mt-2 text-xs font-650 text-#ffb0bb">
          마이크 듣는 중 · {props.speech.elapsedTime().toFixed(1)}초 ·{' '}
          {props.endpointing
            ? '말끝의 짧은 침묵을 감지하면 입력창에 바로 표시해요.'
            : '마이크를 끄면 전체 음성을 인식해요.'}{' '}
          마이크 끄기는 전송하지 않아요.
        </p>
      </Show>
      <Show when={props.speech.modelState().status === 'loading'}>
        <p aria-live="polite" class="mb-0 mt-2 text-xs text-#b8e8d0">
          음성 인식 모델 준비 중 · {props.speech.modelProgress()}%
        </p>
      </Show>
      <Show when={props.speech.errorMessage()}>
        {(message) => (
          <p aria-live="assertive" class="mb-0 mt-2 text-xs text-#ffb0bb" role="alert">
            {message()}
          </p>
        )}
      </Show>
    </form>
  )
}

interface ContextSidebarProps {
  readonly chat: ChatController
  readonly disableRefining: boolean
  readonly modelLabel: string
  readonly onClear: () => void
  readonly onDisableRefiningChange: (disabled: boolean) => void
  readonly onPrepare: () => void
  readonly onSpeakBeforeRefiningChange: (enabled: boolean) => void
  readonly speakBeforeRefining: boolean
  readonly voice: ChatVoiceController
}

const ContextSidebar = (props: ContextSidebarProps) => (
  <aside class="border-t border-white/8 bg-#17131f/45 p-5 lg:border-l lg:border-t-0">
    <h2 class="m-0 text-sm font-700 text-#eee5ef">대화 컨텍스트</h2>
    <p class="mb-0 mt-2 text-xs leading-5 text-#918697">
      최근 대화는 원문으로, 오래된 대화는 사실과 선호 중심의 기억 메모로 유지해요.
    </p>

    <dl class="mt-5 grid gap-3">
      <div class="rounded-4 bg-white/5 p-3">
        <dt class="text-xs text-#918697">현재 입력 토큰</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-750 text-#f8edf1">
          {props.chat.contextTokens().toLocaleString()}
          <span class="ml-1 text-xs font-500 text-#918697">
            / {COMPACTION_THRESHOLD.toLocaleString()}
          </span>
        </dd>
      </div>
      <div class="rounded-4 bg-white/5 p-3">
        <dt class="text-xs text-#918697">압축 횟수</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-750 text-#f8edf1">{props.chat.summaryCount()}회</dd>
      </div>
    </dl>

    <p aria-live="polite" class="mb-0 mt-5 text-xs leading-5 text-#bdb2c4">
      {props.chat.statusMessage()}
    </p>

    <div class="mt-3 rounded-4 border border-white/8 bg-white/4 p-3">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-700 text-#eee5ef">답변 음성</span>
        <Show when={props.voice.isPlaying()}>
          <button
            class={cx(
              'rounded-full border border-#f2a7b8/35 bg-#f2a7b8/10 px-3 py-1',
              'text-xs font-700 text-#ffc0ce hover:bg-#f2a7b8/18',
            )}
            onClick={() => props.voice.stop()}
            type="button"
          >
            재생 중지
          </button>
        </Show>
      </div>
      <p aria-live="polite" class="mb-0 mt-2 text-xs leading-5 text-#bdb2c4">
        {props.voice.statusMessage()}
      </p>
      <label class="mt-3 flex cursor-pointer items-start gap-2 border-t border-white/8 pt-3">
        <input
          checked={props.speakBeforeRefining}
          class="mt-0.5 h-4 w-4 accent-#9ed6bb"
          onChange={(event) => props.onSpeakBeforeRefiningChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          <span class="block text-xs font-700 text-#eee5ef">리파이닝 전에 말하기</span>
          <span class="mt-1 block text-[11px] leading-4 text-#918697">
            완성된 문장부터 읽고, 다듬어진 답변은 다시 읽지 않아요.
          </span>
        </span>
      </label>
      <label class="mt-3 flex cursor-pointer items-start gap-2 border-t border-white/8 pt-3">
        <input
          checked={props.disableRefining}
          class="mt-0.5 h-4 w-4 accent-#f2a7b8"
          onChange={(event) => props.onDisableRefiningChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          <span class="block text-xs font-700 text-#eee5ef">리파이닝 끄기</span>
          <span class="mt-1 block text-[11px] leading-4 text-#918697">
            두 번째 생성 단계를 건너뛰며 외국어 문자가 남을 수 있어요.
          </span>
        </span>
      </label>
    </div>

    <Show when={!props.chat.isModelReady()}>
      <button
        class={cx(BUTTON_CLASSES, 'mt-4 w-full bg-#f2a7b8 text-#2a1720 hover:bg-#ffc0ce')}
        disabled={!props.chat.canPrepare()}
        onClick={() => props.onPrepare()}
        type="button"
      >
        {props.chat.state().status === 'loading' ? '모델 준비 중…' : `${props.modelLabel} 준비하기`}
      </button>
    </Show>

    <Show when={props.chat.isModelReady() && props.voice.canPrepare()}>
      <button
        class={cx(BUTTON_CLASSES, 'mt-3 w-full bg-#f2a7b8 text-#2a1720 hover:bg-#ffc0ce')}
        onClick={() => props.voice.prepare()}
        type="button"
      >
        답변 음성 다시 준비하기
      </button>
    </Show>

    <button
      class={cx(
        BUTTON_CLASSES,
        'mt-3 w-full border border-white/10 bg-white/4 text-#d9cfdd hover:bg-white/8',
      )}
      disabled={!props.chat.canClear()}
      onClick={() => props.onClear()}
      type="button"
    >
      새 대화
    </button>

    <p class="mb-0 mt-5 text-[11px] leading-5 text-#786d80">
      대화와 요약은 서버로 전송되지 않으며 페이지를 닫으면 사라져요.
    </p>
  </aside>
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

      <div class="grid min-h-[68dvh] lg:grid-cols-[minmax(0,1fr)_17rem]">
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
