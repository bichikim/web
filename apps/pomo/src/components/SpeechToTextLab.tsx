import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, type JSX, Match, Show, Switch, untrack} from 'solid-js'

import {
  getSpeechModel,
  RECOMMENDED_SPEECH_MODEL_ID,
  SPEECH_MODELS,
  type SpeechModelDefinition,
  useSpeechToText,
} from '../features/speech-to-text'
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

interface SpeechModelWorkspaceProps {
  readonly model: SpeechModelDefinition
}

const SpeechModelWorkspace = (props: SpeechModelWorkspaceProps) => {
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
          'sm:flex sm:items-center sm:justify-between sm:gap-4',
        )}
      >
        <span>모델별 첫 사용 시 파일을 내려받아 브라우저 캐시에 저장해요.</span>
        <span>WebGPU를 쓸 수 없으면 WASM으로 실행해요.</span>
      </footer>
    </div>
  )
}

export const SpeechToTextLab = () => {
  const [selectedModelId, setSelectedModelId] = createSignal(RECOMMENDED_SPEECH_MODEL_ID)
  const selectedModel = createMemo(() => getSpeechModel(selectedModelId()))

  return (
    <section class={SPEECH_PANEL_CLASSES}>
      <header>
        <p class="m-0 text-xs font-750 tracking-[0.24em] text-#9ed6bb uppercase">
          Korean ASR · On-device
        </p>
        <h1 class="mb-0 mt-3 text-2xl font-800 tracking--0.03em sm:text-4xl">
          한국어 받아쓰기 모델 비교
        </h1>
        <p class="mb-0 mt-3 max-w-2xl text-sm leading-6 text-#bdb2c4 sm:text-base">
          가벼운 한국어 특화 모델부터 정확도 중심 모델까지 같은 마이크로 직접 비교하세요. 음성은
          서버로 보내지 않고 이 브라우저 안에서 처리해요.
        </p>
      </header>

      <fieldset class="m-0 mt-7 grid gap-3 border-0 p-0">
        <legend class="mb-2 text-sm font-700 text-#e9dfe9">시험할 모델</legend>
        <div class="grid gap-2 sm:grid-cols-3">
          <For each={SPEECH_MODELS}>
            {(model) => (
              <label
                class={cx(
                  'grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-4 border p-4 transition',
                  selectedModelId() === model.id
                    ? 'border-#9ed6bb/55 bg-#9ed6bb/10'
                    : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/7',
                )}
              >
                <input
                  checked={selectedModelId() === model.id}
                  class="row-span-3 mt-0.5 h-4 w-4 accent-#9ed6bb"
                  name="speech-model"
                  onChange={() => setSelectedModelId(model.id)}
                  type="radio"
                  value={model.id}
                />
                <span class="flex flex-wrap items-center gap-2 text-sm font-750 text-#f8edf1">
                  {model.label}
                  <Show when={model.id === RECOMMENDED_SPEECH_MODEL_ID}>
                    <span class="rounded-full bg-#9ed6bb/16 px-2 py-0.5 text-[10px] text-#b8e8d0">
                      추천
                    </span>
                  </Show>
                </span>
                <span class="text-[11px] font-650 text-#9ed6bb">
                  {model.speedLabel} · {model.sizeLabel}
                </span>
                <span class="text-xs leading-5 text-#a99ead">{model.description}</span>
              </label>
            )}
          </For>
        </div>
      </fieldset>

      <Show keyed when={selectedModel()}>
        {(model) => <SpeechModelWorkspace model={model} />}
      </Show>
    </section>
  )
}

export default SpeechToTextLab
