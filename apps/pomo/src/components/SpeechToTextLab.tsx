import {cx} from 'class-variance-authority'
import {type JSX, Match, Show, Switch} from 'solid-js'

import {useSpeechToText} from '../features/speech-to-text'
import {
  SPEECH_BUTTON_CLASSES,
  SPEECH_PANEL_CLASSES,
  SPEECH_TEXTAREA_CLASSES,
} from './speech-to-text-lab.style'

const MicrophoneIcon = (props: {readonly recording: boolean}) => (
  <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
    <Show
      fallback={
        <>
          <rect fill="currentColor" height="12" rx="4" width="8" x="8" y="2" />
          <path
            d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
          />
        </>
      }
      when={props.recording}
    >
      <rect fill="currentColor" height="10" rx="2" width="10" x="7" y="7" />
    </Show>
  </svg>
)

export const SpeechToTextLab = () => {
  const speech = useSpeechToText()
  const isBusy = () => {
    const activity = speech.activity()
    return activity === 'checking' || activity === 'processing' || activity === 'requesting'
  }
  const isRecording = () => speech.activity() === 'recording'
  const buttonLabel = () => {
    if (isRecording()) {
      return '녹음 멈추고 받아쓰기'
    }

    return isBusy() ? '마이크 또는 음성을 처리하는 중' : '마이크로 받아쓰기'
  }
  const backendLabel = () => (speech.backend() === 'webgpu' ? 'WebGPU' : 'WASM')
  const handleTextInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) => {
    speech.setText(event.currentTarget.value)
  }

  return (
    <section class={SPEECH_PANEL_CLASSES}>
      <header class="flex items-start justify-between gap-5">
        <div>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#9ed6bb uppercase">
            Whisper tiny · On-device
          </p>
          <h1 class="mb-0 mt-3 text-2xl font-800 tracking--0.03em sm:text-4xl">말하면 바로 글로</h1>
          <p class="mb-0 mt-3 max-w-2xl text-sm leading-6 text-#bdb2c4 sm:text-base">
            마이크를 눌러 한국어로 말한 뒤 다시 누르세요. 음성은 서버로 보내지 않고 이 브라우저
            안에서 처리해요.
          </p>
        </div>
        <span
          class={cx(
            'hidden shrink-0 rounded-full border border-white/10 bg-white/5',
            'px-3 py-1.5 text-xs font-650 text-#bdb2c4 sm:block',
          )}
        >
          {backendLabel()}
        </span>
      </header>

      <div class="mt-8 grid gap-3">
        <div class="flex min-h-6 items-center justify-between gap-3 text-xs">
          <div aria-live="polite" class="flex items-center gap-2 text-#bdb2c4">
            <Switch>
              <Match when={isRecording()}>
                <span class="h-2 w-2 animate-pulse rounded-full bg-#ff8e9e" />
                <span class="font-650 text-#ffb0bb">
                  녹음 중 · {speech.elapsedTime().toFixed(1)}초
                </span>
              </Match>
              <Match when={isBusy()}>
                <span class="h-2 w-2 animate-pulse rounded-full bg-#9ed6bb" />
                <span class="font-650 text-#b8e8d0">
                  {speech.activity() === 'requesting' ? '마이크 권한 확인 중…' : '받아쓰는 중…'}
                </span>
              </Match>
              <Match when={speech.modelState().status === 'loading'}>
                <span>모델 준비 중 · {speech.modelProgress()}%</span>
              </Match>
              <Match when={true}>
                <span>준비됨 · 한국어</span>
              </Match>
            </Switch>
          </div>
          <span class="text-#8f8297 sm:hidden">{backendLabel()}</span>
        </div>

        <Show when={speech.modelState().status === 'loading'}>
          <div
            aria-label={`음성 인식 모델 ${speech.modelProgress()}% 준비됨`}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={speech.modelProgress()}
            class="h-1.5 overflow-hidden rounded-full bg-white/8"
            role="progressbar"
          >
            <div
              class="h-full rounded-full bg-#9ed6bb transition-[width]"
              style={{width: `${speech.modelProgress()}%`}}
            />
          </div>
        </Show>

        <label class="sr-only" for="speech-transcript">
          받아쓰기 결과
        </label>
        <div class="relative">
          <textarea
            class={SPEECH_TEXTAREA_CLASSES}
            id="speech-transcript"
            onInput={handleTextInput}
            placeholder="마이크를 누르고 한국어로 말해 보세요. 직접 입력하거나 결과를 수정할 수도 있어요."
            value={speech.text()}
          />
          <button
            aria-label={buttonLabel()}
            aria-pressed={isRecording()}
            class={cx(
              SPEECH_BUTTON_CLASSES,
              isRecording() && 'bg-#ff8e9e text-#401821 hover:bg-#ffb0bb',
            )}
            disabled={isBusy() || speech.isSupported() !== true}
            onClick={speech.toggleRecording}
            title={buttonLabel()}
            type="button"
          >
            <MicrophoneIcon recording={isRecording()} />
          </button>
        </div>

        <Show when={speech.errorMessage()}>
          {(message) => (
            <p
              aria-live="assertive"
              class="m-0 rounded-3 bg-#ff8e9e/8 px-3 py-2 text-sm leading-6 text-#ffb0bb"
              role="alert"
            >
              {message()}
            </p>
          )}
        </Show>
      </div>

      <footer
        class={cx(
          'mt-5 grid gap-1 text-xs leading-5 text-#8f8297',
          'sm:flex sm:items-center sm:justify-between sm:gap-4',
        )}
      >
        <span>첫 사용 시 모델을 내려받아 브라우저 캐시에 저장해요.</span>
        <span>HTTPS 또는 localhost에서 마이크를 사용할 수 있어요.</span>
      </footer>
    </section>
  )
}

export default SpeechToTextLab
