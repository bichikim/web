import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type ChatMessage} from '../../features/chat/index'
import {ProcessedKoreanText} from './ProcessedKoreanText'

interface ChatBubbleProps {
  readonly isVoiceGenerating: boolean
  readonly message: ChatMessage
}

export const ChatBubble = (props: ChatBubbleProps) => (
  <article
    class={cx(
      'max-w-[86%] whitespace-pre-wrap rounded-6 px-4 py-3 text-[15px] leading-7 xs:max-w-[76%]',
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
