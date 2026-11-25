import {text as uiText} from '../features/localization'
import {Show} from 'solid-js'
import type {DictationState} from '../features/dictation'

interface SMicrophoneButtonProps {
  readonly state?: DictationState
  readonly level?: number
  readonly disabled?: boolean
  readonly onClick?: () => void
  readonly continuous?: boolean
}

export const SMicrophoneButton = (props: SMicrophoneButtonProps) => {
  const recording = () => props.state === 'recording'
  const waiting = () => props.continuous === true && props.state === 'waiting'
  const processing = () => props.state === 'starting' || props.state === 'transcribing'
  const label = () => {
    if (waiting()) {
      return uiText('답변 중단하고 말하기')
    }
    if (props.continuous) {
      return props.state === 'idle' || props.state === undefined
        ? uiText('연속 대화 시작')
        : uiText('연속 대화 종료')
    }
    switch (props.state ?? 'idle') {
      case 'idle':
        return uiText('음성 입력')
      case 'waiting':
        return uiText('연속 대화 종료')
      case 'starting':
        return uiText('마이크 연결 취소')
      case 'recording':
        return uiText('녹음 끝내기')
      case 'transcribing':
        return uiText('음성 인식 취소')
    }
  }
  return (
    <button
      type="button"
      aria-keyshortcuts="Alt+M"
      aria-label={label()}
      aria-pressed={
        props.continuous ? props.state !== 'idle' && props.state !== undefined : recording()
      }
      aria-busy={processing()}
      title={
        waiting()
          ? uiText('마이크 대기 중 · 누르면 답변을 멈추고 듣기 · Alt+M')
          : recording()
            ? uiText('듣는 중 · Alt+M으로 전송 · Esc로 종료')
            : `${label()} · Alt+M`
      }
      disabled={props.disabled}
      onClick={() => props.onClick?.()}
      style={{'--microphone-level': recording() ? (props.level ?? 0) : 0}}
      class="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center overflow-hidden
      rounded-lg border-0 bg-transparent p-0 text-stone-600 hover:bg-stone-100
      aria-pressed:bg-red-50 aria-pressed:text-red-700
      data-[waiting=true]:bg-stone-100 data-[waiting=true]:text-stone-600
      focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700
      disabled:cursor-default disabled:opacity-40"
      data-waiting={waiting()}
    >
      <Show when={recording()}>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-1 rounded-full border border-solid border-red-400
          [border-width:calc(1px+var(--microphone-level)*2px)] [opacity:calc(.25+var(--microphone-level)*.5)]"
        />
      </Show>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="pointer-events-none relative h-5 w-5 fill-none stroke-current stroke-2
        [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <Show
          when={processing()}
          fallback={
            <>
              <Show when={recording()}>
                <rect
                  x="9"
                  y="2"
                  width="6"
                  height="12"
                  rx="3"
                  class="fill-current stroke-none
                  [clip-path:inset(calc((1-var(--microphone-level))*100%)_0_0_0)]"
                />
              </Show>
              <path d="M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V5ZM5 10v1a7 7 0 0 0 14 0v-1M12 18v4m-4 0h8" />
            </>
          }
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            class="origin-center animate-spin [stroke-dasharray:32_20] motion-reduce:animate-none"
          />
        </Show>
      </svg>
      <Show when={waiting()}>
        <svg
          role="img"
          aria-label={uiText('마이크 대기 중')}
          viewBox="0 0 12 12"
          class="pointer-events-none absolute right-0.5 bottom-0.5 h-3 w-3
          fill-stone-100 stroke-stone-600 [stroke-width:1.3]"
        >
          <circle cx="6" cy="6" r="5" />
          <path d="M4.5 3.5v5m3-5v5" />
        </svg>
      </Show>
    </button>
  )
}
