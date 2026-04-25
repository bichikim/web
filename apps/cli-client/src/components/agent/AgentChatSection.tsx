import {For, Show} from 'solid-js'

const BTN_SHARED = [
  'appearance-none',
  'rounded-[10px]',
  'border',
  'py-[0.55rem]',
  'px-4',
  'font-inherit',
  'cursor-pointer',
  'disabled:opacity-45',
  'disabled:cursor-not-allowed',
].join(' ')

const BTN_PRIMARY = [
  BTN_SHARED,
  'border-[#3f65d4]',
  'bg-gradient-to-b',
  'from-[#355dcc]',
  'to-[#2f54b8]',
  'text-inherit',
].join(' ')

const BTN_SECONDARY = [BTN_SHARED, 'border-[#354253]', 'bg-[#17202c]', 'text-inherit'].join(' ')

const FIELD_SHARED = [
  'w-full',
  'rounded-[10px]',
  'border',
  'border-[#2c3642]',
  'bg-[#121922]',
  'text-inherit',
  'font-inherit',
  'focus:outline',
  'focus:outline-2',
  'focus:outline-[#5b8cff]',
  'focus:outline-offset-1',
].join(' ')

const PRE = 'm-0 whitespace-pre-wrap break-words font-mono text-[0.85rem] leading-[1.45]'

const bubbleUser = [
  'max-w-[min(85%,36rem)]',
  'ml-auto',
  'rounded-[14px]',
  'rounded-br-[6px]',
  'border border-[#3a55a8]',
  'bg-gradient-to-b',
  'from-[#355dcc]',
  'to-[#2f54b8]',
  'px-[0.9rem] py-[0.65rem]',
  'text-[0.95rem]',
  'leading-[1.45]',
  'whitespace-pre-wrap break-words',
].join(' ')

const bubbleAssistant = [
  'max-w-[min(85%,36rem)]',
  'mr-auto',
  'rounded-[14px]',
  'rounded-bl-[6px]',
  'border border-[#2c3642]',
  'bg-[#151c26]',
  'px-[0.9rem] py-[0.65rem]',
  'text-[0.95rem]',
  'leading-[1.45]',
  'whitespace-pre-wrap break-words',
].join(' ')

export interface ChatMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
}

interface AgentChatSectionProperties {
  readonly messages: readonly ChatMessage[]
  readonly promptText: string
  readonly isRunning: boolean
  readonly streamError: string | null
  readonly onMountScrollRoot: (element: HTMLDivElement) => void
  readonly onInputPrompt: (value: string) => void
  readonly onClickAbort: () => void
  readonly onSubmitPrompt: (event: Event & {currentTarget: HTMLFormElement}) => void
  readonly onPromptKeyDown: (event: KeyboardEvent & {currentTarget: HTMLTextAreaElement}) => void
}

export function AgentChatSection(properties: AgentChatSectionProperties) {
  return (
    <>
      <div
        class="flex-1 min-h-0 overflow-y-auto py-4 flex flex-col gap-3"
        ref={(element) => {
          properties.onMountScrollRoot(element)
        }}
      >
        <Show
          when={properties.messages.length === 0}
          children={
            <p class="m-auto text-center text-[#6c7a8a] text-[0.9rem] px-4">
              메시지를 입력하고 전송하세요. 응답을 모두 받을 때까지는 새 메시지를 보낼 수 없습니다.
            </p>
          }
        />

        <For each={properties.messages}>
          {(message) => (
            <div
              class={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              data-role={message.role}
            >
              <div class={message.role === 'user' ? bubbleUser : bubbleAssistant}>
                <Show
                  when={
                    message.role === 'assistant' &&
                    message.content.length === 0 &&
                    properties.isRunning &&
                    properties.messages[properties.messages.length - 1]?.id === message.id
                  }
                  children={<span class="text-[#7a8a9c]">응답 작성 중…</span>}
                  fallback={message.content}
                />
              </div>
            </div>
          )}
        </For>
      </div>

      <Show
        when={properties.streamError !== null}
        children={
          <section
            class="shrink-0 mb-2 p-3 rounded-[12px] border border-[#7a3040] bg-[#1b1216]"
            aria-live="polite"
          >
            <h2 class="mt-0 mb-2 text-[0.85rem] font-[650]">오류</h2>
            <pre class={PRE}>{properties.streamError!}</pre>
          </section>
        }
      />

      <form
        class="shrink-0 flex flex-col gap-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[#273244]"
        onSubmit={properties.onSubmitPrompt}
      >
        <textarea
          id="prompt-input"
          class={`${FIELD_SHARED} resize-none min-h-[5.5rem] max-h-40 px-[0.85rem] py-3`}
          rows={4}
          placeholder="메시지 입력… (Enter 전송 · Shift+Enter 줄바꿈)"
          value={properties.promptText}
          onInput={(event) => properties.onInputPrompt(event.currentTarget.value)}
          onKeyDown={properties.onPromptKeyDown}
          disabled={properties.isRunning}
          aria-label="채팅 입력"
        />

        <div class="flex gap-2 justify-end">
          <button
            class={BTN_SECONDARY}
            type="button"
            disabled={!properties.isRunning}
            onClick={properties.onClickAbort}
          >
            중단
          </button>
          <button class={BTN_PRIMARY} type="submit" disabled={properties.isRunning}>
            전송
          </button>
        </div>
      </form>
    </>
  )
}
