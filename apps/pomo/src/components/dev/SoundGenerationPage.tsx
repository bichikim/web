import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {createEffect, createSignal, Show} from 'solid-js'

import {DEFAULT_CONNECTION_SECONDS, useSoundGeneration} from 'src/features/sound-generation'
import {ModelTerms} from './sound-generation/ModelTerms'
import {CrossfadeAudio, type CrossfadePlaybackState} from './sound-generation/CrossfadeAudio'
import {
  SoundGenerationForm,
  type SoundGenerationFormRequest,
} from './sound-generation/SoundGenerationForm'

export function SoundGenerationPage() {
  const [repeat, setRepeat] = createSignal(false)
  const [connectionEnabled, setConnectionEnabled] = createSignal(true)
  const [connectionSeconds, setConnectionSeconds] = createSignal(DEFAULT_CONNECTION_SECONDS)
  const [handoff, setHandoff] = createSignal<CrossfadePlaybackState | null>(null)
  const generation = useSoundGeneration()
  let nativeAudio: HTMLAudioElement | undefined

  const applyNativeHandoff = () => {
    const element = nativeAudio
    const state = handoff()
    if (element === undefined || state === null) {
      return
    }
    if (element.readyState < 1 || !Number.isFinite(element.duration)) {
      return
    }
    element.currentTime = Math.min(Math.max(state.position, 0), element.duration)
    if (state.playing) {
      Promise.resolve(element.play()).catch(() => undefined)
    }
    setHandoff(null)
  }
  createEffect(() => {
    if (!repeat() || !connectionEnabled()) {
      handoff()
      applyNativeHandoff()
    }
  })
  const handleConnectionEnabledChange = (enabled: boolean) => {
    if (enabled && repeat() && nativeAudio !== undefined) {
      const state = {playing: !nativeAudio.paused, position: nativeAudio.currentTime}
      setConnectionEnabled(true)
      setHandoff(state)
      return
    }
    setConnectionEnabled(enabled)
  }
  const generate = (request: SoundGenerationFormRequest) => {
    setHandoff(null)
    generation.generate(request)
  }

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
          <SoundGenerationForm
            busy={generation.busy}
            connectionEnabled={connectionEnabled}
            connectionSeconds={connectionSeconds}
            error={generation.error}
            onConnectionEnabledChange={handleConnectionEnabledChange}
            onConnectionSecondsChange={setConnectionSeconds}
            onGenerate={generate}
            onStop={generation.stop}
            status={generation.status}
          />
          <Show when={generation.url()}>
            {(url) => (
              <section
                aria-label="생성한 환경음"
                class="mt-6 grid gap-3 border-t border-white/10 pt-6"
              >
                <h2 class="m-0 text-lg">생성한 환경음</h2>
                <Show
                  fallback={
                    <audio
                      aria-label="생성한 환경음 재생"
                      class="w-full"
                      controls
                      loop={repeat()}
                      onLoadedMetadata={applyNativeHandoff}
                      ref={(element) => {
                        nativeAudio = element
                        applyNativeHandoff()
                      }}
                      src={url()}
                    />
                  }
                  when={repeat() && connectionEnabled() && connectionSeconds() > 0}
                >
                  <CrossfadeAudio
                    autoPlay={handoff()?.playing ?? false}
                    connectionSeconds={connectionSeconds()}
                    initialPosition={handoff()?.position ?? 0}
                    onStateChange={setHandoff}
                    url={url()}
                  />
                </Show>
                <label class="inline-flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={repeat()}
                    onChange={(event) => {
                      const enabled = event.currentTarget.checked
                      if (enabled && nativeAudio !== undefined) {
                        setHandoff({
                          playing: !nativeAudio.paused,
                          position: nativeAudio.currentTime,
                        })
                      }
                      setRepeat(enabled)
                    }}
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
