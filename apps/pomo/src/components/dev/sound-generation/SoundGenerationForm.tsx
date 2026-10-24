import {type Accessor, createSignal, For, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import {
  canCreateGenerationPlan,
  type ChunkNoiseMode,
  DEFAULT_CHUNK_NOISE_MODE,
  MAX_GENERATION_CONNECTION_SECONDS,
  MAX_REQUEST_SECONDS,
} from 'src/features/sound-generation'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {ChunkNoiseModeField} from './ChunkNoiseModeField'

const DEFAULT_SECONDS = 5

const PRESETS = [
  {
    label: '비',
    prompt:
      'Steady continuous rainfall ambience only, with soft even raindrops falling on a window, roof, leaves, ' +
      'and wet ground. Uniform intensity, stable volume, consistent texture from beginning to end.',
  },
  {
    label: '파도',
    prompt: 'Gentle ocean waves washing onto a sandy beach, soft sea breeze, no music, no speech.',
  },
  {
    label: '숲',
    prompt:
      'Quiet forest ambience, leaves rustling in a light breeze, distant birds, no music, no speech.',
  },
  {label: '카페', prompt: 'Cozy cafe ambience, soft indistinct chatter, cups clinking, no music.'},
]

function isValidConnection(enabled: boolean, value: number, totalSeconds: number): boolean {
  if (!enabled) {
    return true
  }
  if (!Number.isInteger(value) || value < 1 || value > MAX_GENERATION_CONNECTION_SECONDS) {
    return false
  }
  if (!Number.isInteger(totalSeconds) || totalSeconds < 1 || totalSeconds > MAX_REQUEST_SECONDS) {
    return true
  }
  return canCreateGenerationPlan(totalSeconds, value)
}

export interface SoundGenerationFormRequest {
  readonly chunkNoiseMode: ChunkNoiseMode
  readonly connectionSeconds: number
  readonly negativePrompt: string
  readonly prompt: string
  readonly seconds: number
}

export interface SoundGenerationFormProps {
  readonly busy: Accessor<boolean>
  readonly connectionEnabled: Accessor<boolean>
  readonly connectionSeconds: Accessor<number>
  readonly error: Accessor<string | null>
  readonly onConnectionEnabledChange: (enabled: boolean) => void
  readonly onConnectionSecondsChange: (seconds: number) => void
  readonly onGenerate: (request: SoundGenerationFormRequest) => void
  readonly onStop: () => void
  readonly status: Accessor<string>
}

export function SoundGenerationForm(props: SoundGenerationFormProps) {
  const [negativePrompt, setNegativePrompt] = createSignal('')
  const [prompt, setPrompt] = createSignal(PRESETS[0].prompt)
  const [seconds, setSeconds] = createSignal(DEFAULT_SECONDS)
  const [chunkNoiseMode, setChunkNoiseMode] = createSignal<ChunkNoiseMode>(DEFAULT_CHUNK_NOISE_MODE)
  const connectionIsValid = () =>
    isValidConnection(props.connectionEnabled(), props.connectionSeconds(), seconds())
  const generate = () => {
    props.onGenerate({
      chunkNoiseMode: chunkNoiseMode(),
      connectionSeconds: props.connectionEnabled() ? props.connectionSeconds() : 0,
      negativePrompt: negativePrompt(),
      prompt: prompt(),
      seconds: seconds(),
    })
  }

  return (
    <>
      <div aria-label="환경음 예시" class="mb-5 flex flex-wrap gap-2">
        <For each={PRESETS}>
          {(preset) => (
            <button
              class={cx(
                'min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-#f8edf1',
                'hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-#9ed6bb',
              )}
              onClick={() => setPrompt(preset.prompt)}
              type="button"
            >
              {preset.label}
            </button>
          )}
        </For>
      </div>
      <label class="mb-2 block text-sm font-700" for="sound-prompt">
        소리 설명
      </label>
      <textarea
        class={cx(
          'min-h-36 w-full resize-y rounded-xl border border-white/20 bg-#17131f p-4',
          'text-base leading-7 text-#f8edf1 focus-visible:outline-2 focus-visible:outline-#9ed6bb',
        )}
        id="sound-prompt"
        onInput={(event) => setPrompt(event.currentTarget.value)}
        value={prompt()}
      />
      <label class="mt-5 mb-2 block text-sm font-700" for="sound-negative-prompt">
        네거티브 프롬프트
      </label>
      <textarea
        aria-describedby="sound-negative-prompt-help"
        class={cx(
          'min-h-28 w-full resize-y rounded-xl border border-white/20 bg-#17131f p-4',
          'text-base leading-7 text-#f8edf1 focus-visible:outline-2 focus-visible:outline-#9ed6bb',
        )}
        id="sound-negative-prompt"
        onInput={(event) => setNegativePrompt(event.currentTarget.value)}
        placeholder="예: no rain, no thunder, no wind, no voices, no music"
        value={negativePrompt()}
      />
      <p class="mt-2 text-xs leading-5 text-#bdb2c4" id="sound-negative-prompt-help">
        원하지 않는 소리를 영어로 쉼표로 구분해 입력하세요. 예: no rain, no wind, no music
      </p>
      <div class="mt-5 flex flex-wrap items-end gap-4">
        <label class="grid gap-2 text-sm font-700" for="sound-duration">
          길이
          <input
            class="min-h-11 rounded-xl border border-white/20 bg-#17131f px-4 text-#f8edf1"
            id="sound-duration"
            type="number"
            min="1"
            max={MAX_REQUEST_SECONDS}
            step="1"
            disabled={props.busy()}
            value={seconds()}
            onInput={(event) => setSeconds(event.currentTarget.valueAsNumber)}
          />
          <span class="text-xs text-#bdb2c4">초 · 최대 3,600초 (1시간)</span>
        </label>
        <label class="inline-flex min-h-11 items-center gap-2 self-end text-sm font-700">
          <input
            aria-label="연결 구간 사용"
            type="checkbox"
            checked={props.connectionEnabled()}
            disabled={props.busy()}
            onChange={(event) => props.onConnectionEnabledChange(event.currentTarget.checked)}
          />
          연결 구간 사용
        </label>
        <Show when={props.connectionEnabled()}>
          <label class="grid gap-2 text-sm font-700" for="sound-connection-seconds">
            연결 구간 (초)
            <input
              class="min-h-11 rounded-xl border border-white/20 bg-#17131f px-4 text-#f8edf1"
              id="sound-connection-seconds"
              type="number"
              min="1"
              max={MAX_GENERATION_CONNECTION_SECONDS}
              step="1"
              disabled={props.busy()}
              value={props.connectionSeconds()}
              onInput={(event) =>
                props.onConnectionSecondsChange(event.currentTarget.valueAsNumber)
              }
            />
            <span class="text-xs text-#bdb2c4">
              1–{MAX_GENERATION_CONNECTION_SECONDS}초 · 기본 4초
            </span>
            <span class="text-xs leading-5 text-#bdb2c4">
              긴 소리를 나눠 생성할 때 구간 사이를 이 시간만큼 겹쳐 연결합니다.
            </span>
          </label>
        </Show>
        <ChunkNoiseModeField
          disabled={props.busy()}
          onChange={(mode) => setChunkNoiseMode(mode)}
          value={chunkNoiseMode()}
        />
        <button
          class="min-h-11 rounded-xl border-0 bg-#b8e8d0 px-6 font-700 text-#17131f disabled:opacity-50"
          disabled={props.busy() || !isNonBlankString(prompt()) || !connectionIsValid()}
          onClick={generate}
          type="button"
        >
          {props.busy() ? '생성 중…' : '환경음 생성'}
        </button>
        <Show when={props.busy()}>
          <button
            class="min-h-11 rounded-xl border border-white/20 bg-transparent px-5 text-#f8edf1"
            onClick={() => props.onStop()}
            type="button"
          >
            중지
          </button>
        </Show>
      </div>
      <p class="break-words text-sm leading-6 text-#bdb2c4" role="status">
        {props.status()}
      </p>
      <Show when={props.error()}>
        {(error) => (
          <p class="text-sm leading-6 text-#ffc0ce" role="alert">
            {error()}
          </p>
        )}
      </Show>
    </>
  )
}
