import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import {type ChatController} from '../../features/chat/index'
import {type ChatVoiceController} from '../../features/chat-voice/index'
import {ChatBubble} from './Bubble'
import {ProcessedKoreanText} from './ProcessedKoreanText'

interface ChatTranscriptProps {
  readonly chat: ChatController
  readonly setMessageList: (element: HTMLDivElement) => void
  readonly voice: ChatVoiceController
}

export const ChatTranscript = (props: ChatTranscriptProps) => {
  const voiceMessageId = () => {
    if (!props.voice.isGenerating()) {
      return null
    }

    return props.chat.messages().at(-1)?.id ?? null
  }

  return (
    <div
      aria-live="polite"
      class="max-h-[58dvh] min-h-96 overflow-y-auto px-5 py-6 xs:px-7"
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
                'px-4 py-3 text-[15px] leading-7 text-#eee5ef xs:max-w-[76%]',
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
