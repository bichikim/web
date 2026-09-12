import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {createEffect, createSignal, on, onCleanup, Show} from 'solid-js'
import {useSoundGeneration} from 'src/features/sound-generation'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {ModelTerms} from './sound-generation/ModelTerms'
import {Preview} from './sound-loop/Preview'

const DEFAULT_TRANSITION = 4
const MAX_TRANSITION = 8
const INPUT = 'min-h-11 rounded-xl border border-white/20 bg-#17131f p-3 text-#f8edf1'
export function SoundLoopPage() {
  const [source, setSource] = createSignal<File | null>(null)
  const [sourceUrl, setSourceUrl] = createSignal<string | null>(null)
  const [resultName, setResultName] = createSignal('')
  const [transition, setTransition] = createSignal(DEFAULT_TRANSITION)
  const [prompt, setPrompt] = createSignal(
    'Continuous gentle rain ambience, consistent texture and loudness, no silence, no music, no speech.',
  )
  const generation = useSoundGeneration()
  let pendingName = ''
  createEffect(
    on(generation.url, (url) => {
      if (url !== null) {
        setResultName(pendingName)
      }
    }),
  )
  onCleanup(() => {
    const url = sourceUrl()
    if (url !== null) {
      URL.revokeObjectURL(url)
    }
  })
  const selectFile = (file: File | null) => {
    const previous = sourceUrl()
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
    setSource(file)
    setSourceUrl(file === null ? null : URL.createObjectURL(file))
  }
  const generate = () => {
    const file = source()
    if (file === null) {
      return
    }
    pendingName = file.name
    generation.generate({
      prompt: prompt(),
      source: file,
      transitionSeconds: transition(),
      type: 'loop',
    })
  }
  return (
    <main class="min-h-dvh bg-#17131f px-5 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 루프 연결</Title>
      <div class="mx-auto max-w-4xl grid gap-6">
        <nav class="flex flex-wrap gap-5 text-#b8e8d0">
          <A href="/dev">← 실험실</A>
          <A href="/dev/sound-player">효과음 겹침 재생</A>
          <A href="/dev/sound-generation">환경음 생성</A>
          <A href="/dev/sound-joining">두 소리 연결</A>
        </nav>
        <header>
          <h1 class="m-0 text-3xl">루프 연결</h1>
          <p class="text-#bdb2c4 leading-7">
            한 음원의 끝과 시작을 AI로 연결합니다. 원본 길이는 유지하고 연결 구간만 교체합니다.
          </p>
        </header>
        <label class="grid gap-3">
          원본 WAV
          <input
            type="file"
            accept=".wav,audio/wav"
            disabled={generation.busy()}
            onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <p class="m-0 text-sm text-#bdb2c4 leading-6">
          환경음 생성 페이지에서 받은 WAV를 사용하세요. 최소 12초, 44.1kHz 스테레오 PCM16 형식을
          지원합니다.
        </p>
        <Show when={sourceUrl()}>{(url) => <Preview label="원본" url={url()} />}</Show>
        <fieldset disabled={generation.busy()} class="m-0 grid gap-4 border-0 p-0">
          <label class="grid gap-2">
            교체할 연결 구간 (초)
            <input
              class={INPUT}
              type="number"
              min="1"
              max="8"
              step="0.5"
              value={transition()}
              onInput={(event) => setTransition(event.currentTarget.valueAsNumber)}
            />
          </label>
          <p class="m-0 text-sm text-#bdb2c4">4초 설정 시 원본 끝 2초와 시작 2초를 교체합니다.</p>
          <label class="grid gap-2">
            영어 소리 설명
            <textarea
              class={`${INPUT} min-h-28`}
              value={prompt()}
              onInput={(event) => setPrompt(event.currentTarget.value)}
            />
          </label>
        </fieldset>
        <div class="flex gap-3">
          <button
            class="min-h-11 rounded-xl border-0 bg-#b8e8d0 px-6 text-#17131f font-700 disabled:opacity-50"
            type="button"
            disabled={
              generation.busy() ||
              source() === null ||
              !isNonBlankString(prompt()) ||
              !Number.isFinite(transition()) ||
              transition() < 1 ||
              transition() > MAX_TRANSITION
            }
            onClick={generate}
          >
            {generation.busy() ? '루프 생성 중…' : 'AI로 루프 만들기'}
          </button>
          <Show when={generation.busy()}>
            <button class={INPUT} type="button" onClick={generation.stop}>
              중지
            </button>
          </Show>
        </div>
        <p role="status" class="m-0 text-sm text-#bdb2c4">
          {generation.status()}
        </p>
        <Show when={generation.error()}>
          {(error) => (
            <p role="alert" class="text-#ffc0ce">
              {error()}
            </p>
          )}
        </Show>
        <Show when={generation.url()}>
          {(url) => (
            <>
              <Preview label="루프 결과" url={url()} />
              <p class="m-0 text-sm text-#bdb2c4">생성에 사용한 파일: {resultName()}</p>
              <a class="text-#b8e8d0 underline" href={url()} download="loop.wav">
                루프 WAV 다운로드
              </a>
            </>
          )}
        </Show>
        <p class="text-sm text-#bdb2c4">
          원본과 결과 모두 반복 재생이 기본으로 켜져 있습니다. 끝 3초부터 들어 연결 부위를
          비교하세요. 오디오는 서버로 전송하지 않습니다.
        </p>
        <ModelTerms />
      </div>
    </main>
  )
}
