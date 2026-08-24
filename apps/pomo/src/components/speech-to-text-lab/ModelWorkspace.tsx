import {cx} from 'class-variance-authority'
import {type JSX, Match, Show, Switch, untrack} from 'solid-js'
import {type SpeechModelDefinition, useSpeechToText} from '../../features/speech-to-text/index'
import {MicrophoneIcon} from './MicrophoneIcon'
import {SPEECH_BUTTON_CLASSES, SPEECH_TEXTAREA_CLASSES} from '../speech-to-text-lab.style'

interface SpeechModelWorkspaceProps {
  readonly model: SpeechModelDefinition
}

export const SpeechModelWorkspace = (props: SpeechModelWorkspaceProps) => {
  const speech = useSpeechToText({modelId: untrack(() => props.model.id)})
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
    <div class="mt-7 grid gap-3">
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
              <span>
                {props.model.label} 준비 중 · {speech.modelProgress()}%
              </span>
            </Match>
            <Match when={true}>
              <span>선택됨 · {props.model.label}</span>
            </Match>
          </Switch>
        </div>
        <span class="text-#8f8297">{backendLabel()}</span>
      </div>

      <Show when={speech.modelState().status === 'loading'}>
        <div
          aria-label={`${props.model.label} ${speech.modelProgress()}% 준비됨`}
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
          placeholder="마이크를 누르고 한국어로 말해 보세요. 모델을 바꿔 같은 문장을 비교할 수 있어요."
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

      <footer
        class={cx(
          'mt-2 grid gap-1 text-xs leading-5 text-#8f8297',
          'xs:flex xs:items-center xs:justify-between xs:gap-4',
        )}
      >
        <span>모델별 첫 사용 시 파일을 내려받아 보관해요.</span>
        <span>WebGPU를 쓸 수 없으면 WASM으로 실행해요.</span>
      </footer>
    </div>
  )
}
