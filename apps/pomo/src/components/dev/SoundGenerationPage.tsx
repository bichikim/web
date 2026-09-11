import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {createSignal, For, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import {MAX_REQUEST_SECONDS, useSoundGeneration} from 'src/features/sound-generation'
import {ModelTerms} from './sound-generation/ModelTerms'

const DEFAULT_SECONDS = 5

const PRESETS = [
  {
    label: '비',
    prompt: 'Gentle steady rain falling on leaves, distant soft thunder, no music, no speech.',
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

export function SoundGenerationPage() {
  const [prompt, setPrompt] = createSignal(PRESETS[0].prompt)
  const [seconds, setSeconds] = createSignal(DEFAULT_SECONDS)
  const [repeat, setRepeat] = createSignal(false)
  const generation = useSoundGeneration()

  return (
    <main class="min-h-dvh bg-#17131f px-5 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 환경음 생성</Title>
      <div class="mx-auto max-w-4xl">
        <A class="inline-flex min-h-11 items-center text-sm text-#f4d7b5 no-underline" href="/dev">
          ← 실험실 목록
        </A>
        <A class="ml-5 text-sm text-#b8e8d0" href="/dev/sound-joining">
          소리 연결 →
        </A>
        <header class="mb-8 mt-6">
          <p class="text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
            Stable Audio 3 Small SFX
          </p>
          <h1 class="mb-3 text-3xl font-750 sm:text-4xl">환경음 생성 스튜디오</h1>
          <p class="text-base leading-7 text-#bdb2c4">
            듣고 싶은 장소와 소리를 영어로 묘사해 보세요.
          </p>
        </header>
        <section
          aria-label="환경음 설정"
          class="rounded-3xl border border-white/10 bg-white/4 p-5 sm:p-8"
        >
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
                disabled={generation.busy()}
                value={seconds()}
                onInput={(event) => setSeconds(event.currentTarget.valueAsNumber)}
              />
              <span class="text-xs text-#bdb2c4">초 · 최대 3,600초 (1시간)</span>
            </label>
            <button
              class="min-h-11 rounded-xl border-0 bg-#b8e8d0 px-6 font-700 text-#17131f disabled:opacity-50"
              disabled={generation.busy() || !prompt().trim()}
              onClick={() => generation.generate({prompt: prompt(), seconds: seconds()})}
              type="button"
            >
              {generation.busy() ? '생성 중…' : '환경음 생성'}
            </button>
            <Show when={generation.busy()}>
              <button
                class="min-h-11 rounded-xl border border-white/20 bg-transparent px-5 text-#f8edf1"
                onClick={generation.stop}
                type="button"
              >
                중지
              </button>
            </Show>
          </div>
          <p class="break-words text-sm leading-6 text-#bdb2c4" role="status">
            {generation.status()}
          </p>
          <Show when={generation.error()}>
            {(error) => (
              <p class="text-sm leading-6 text-#ffc0ce" role="alert">
                {error()}
              </p>
            )}
          </Show>
          <Show when={generation.url()}>
            {(url) => (
              <section
                aria-label="생성한 환경음"
                class="mt-6 grid gap-3 border-t border-white/10 pt-6"
              >
                <h2 class="m-0 text-lg">생성한 환경음</h2>
                <audio
                  aria-label="생성한 환경음 재생"
                  class="w-full"
                  controls
                  loop={repeat()}
                  src={url()}
                />
                <label class="inline-flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={repeat()}
                    onChange={(event) => setRepeat(event.currentTarget.checked)}
                  />
                  반복 재생
                </label>
                <a
                  class="inline-flex min-h-11 items-center text-sm text-#b8e8d0 underline"
                  download="environment.wav"
                  href={url()}
                >
                  WAV 다운로드
                </a>
              </section>
            )}
          </Show>
        </section>
        <ModelTerms />
        <a
          class="mt-6 inline-flex min-h-11 items-center text-sm text-#b8e8d0 underline"
          href="https://huggingface.co/stabilityai/stable-audio-3-small-sfx"
          rel="noreferrer"
          target="_blank"
        >
          모델 정보 및 이용 조건 ↗
        </a>
      </div>
    </main>
  )
}
