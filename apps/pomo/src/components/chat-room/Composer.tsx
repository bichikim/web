import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type ChatController} from '../../features/chat/index'
import {type SpeechToTextController} from '../../features/speech-to-text/index'
import {BUTTON_CLASSES, MAXIMUM_DRAFT_LENGTH} from './shared'

interface ChatComposerProps {
  readonly chat: ChatController
  readonly endpointing: boolean
  readonly onEndpointingChange: (enabled: boolean) => void
  readonly onSend: () => void
  readonly onSpeechToggle: () => void
  readonly speech: SpeechToTextController
}

export const ChatComposer = (props: ChatComposerProps) => {
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
    <form class="border-t border-white/8 p-4 xs:p-5" onSubmit={handleSubmit}>
      <label class="grid gap-2">
        <span class="sr-only">메시지</span>
        <textarea
          class={cx(
            'min-h-24 w-full resize-none box-border rounded-5 border border-white/10 bg-#17131f p-4',
            'text-[0.9375rem] leading-6 text-#f8edf1 outline-none transition placeholder:text-#655b6c',
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
              'rounded-full border px-3 py-1 text-[0.6875rem] font-700 transition',
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
