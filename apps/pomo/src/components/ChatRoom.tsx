import {cx} from 'class-variance-authority'
import {createEffect, createSignal, For, Show} from 'solid-js'

import {type ChatController, type ChatMessage, useChat} from '../features/chat'
import {useKoreanTextSegments} from '../features/korean-text-postprocessor'
import {getTextModel} from '../features/text-generation'
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

interface ChatBubbleProps {
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
    </Show>
  </article>
)

const ChatHeader = (props: {readonly modelLabel: string}) => (
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
    <div
      class={cx(
        'flex shrink-0 items-center gap-2 rounded-full border border-white/10',
        'bg-white/5 px-3 py-2 text-xs font-650 text-#d9cfdd',
      )}
    >
      <span class="h-2 w-2 rounded-full bg-#9ed6bb" />
      {props.modelLabel} · WebGPU
    </div>
  </header>
)

interface ChatTranscriptProps {
  readonly chat: ChatController
  readonly setMessageList: (element: HTMLDivElement) => void
}

const ChatTranscript = (props: ChatTranscriptProps) => (
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
        <For each={props.chat.messages()}>{(message) => <ChatBubble message={message} />}</For>
        <Show when={props.chat.streamingText().length > 0 || props.chat.isBusy()}>
          <article
            class={cx(
              'mr-auto max-w-[86%] whitespace-pre-wrap rounded-6 rounded-bl-2 bg-white/7',
              'px-4 py-3 text-[15px] leading-7 text-#eee5ef sm:max-w-[76%]',
            )}
          >
            <ProcessedKoreanText text={props.chat.streamingText()} />
            <span aria-hidden="true" class="ml-1 inline-block h-4 w-0.5 animate-pulse bg-#9ed6bb" />
            <span class="sr-only">답변 작성 중</span>
          </article>
        </Show>
      </div>
    </Show>
  </div>
)

interface ChatComposerProps {
  readonly chat: ChatController
}

const ChatComposer = (props: ChatComposerProps) => {
  const handleDraftInput = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => {
    props.chat.setDraft(event.currentTarget.value)
  }
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    props.chat.send()
  }
  const handleDraftKeyDown = (event: KeyboardEvent & {currentTarget: HTMLTextAreaElement}) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      props.chat.send()
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
      <div class="mt-3 flex items-center justify-between gap-4">
        <span class="text-xs text-#8f8297">Enter 전송 · Shift+Enter 줄바꿈</span>
        <button
          class={cx(BUTTON_CLASSES, 'bg-#9ed6bb text-#14251d hover:bg-#b8e8d0')}
          disabled={!props.chat.canSend()}
          type="submit"
        >
          보내기
        </button>
      </div>
    </form>
  )
}

interface ContextSidebarProps {
  readonly chat: ChatController
  readonly modelLabel: string
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

    <Show when={!props.chat.isModelReady()}>
      <button
        class={cx(BUTTON_CLASSES, 'mt-4 w-full bg-#f2a7b8 text-#2a1720 hover:bg-#ffc0ce')}
        disabled={!props.chat.canPrepare()}
        onClick={() => props.chat.prepare()}
        type="button"
      >
        {props.chat.state().status === 'loading' ? '모델 준비 중…' : `${props.modelLabel} 준비하기`}
      </button>
    </Show>

    <button
      class={cx(
        BUTTON_CLASSES,
        'mt-3 w-full border border-white/10 bg-white/4 text-#d9cfdd hover:bg-white/8',
      )}
      disabled={!props.chat.canClear()}
      onClick={() => props.chat.clear()}
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
  const model = getTextModel('qwen-4b')
  const chat = useChat({modelId: model.id})
  const [messageList, setMessageList] = createSignal<HTMLDivElement>()

  createEffect(() => {
    chat.messages()
    chat.streamingText()
    const element = messageList()
    queueMicrotask(() => {
      element?.scrollTo({behavior: 'smooth', top: element.scrollHeight})
    })
  })

  return (
    <section class={PANEL_CLASSES}>
      <ChatHeader modelLabel={model.label} />

      <div class="grid min-h-[68dvh] lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div class="grid min-h-0 grid-rows-[1fr_auto]">
          <ChatTranscript chat={chat} setMessageList={setMessageList} />
          <ChatComposer chat={chat} />
        </div>
        <ContextSidebar chat={chat} modelLabel={model.label} />
      </div>
    </section>
  )
}

export default ChatRoom
