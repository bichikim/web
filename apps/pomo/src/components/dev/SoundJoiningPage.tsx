import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {createSignal, Show} from 'solid-js'
import {useSoundJoining} from 'src/features/sound-joining'
import {isNonBlankString} from 'src/utils/is-non-blank-string'
import {ModelTerms} from './sound-generation/ModelTerms'
import {Source} from './sound-joining/Source'
import {Introduction} from './sound-joining/Introduction'

const DEFAULT_TRANSITION = 4
const DEFAULT_PROMPT =
  'Continuous gentle rain ambience, consistent texture and loudness, no silence, no music, no speech.'
const INPUT = 'min-h-11 rounded-xl border border-white/20 bg-#17131f p-3 text-#f8edf1'
export function SoundJoiningPage() {
  const [first, setFirst] = createSignal<File | null>(null)
  const [second, setSecond] = createSignal<File | null>(null)
  const [trimEnd, setTrimEnd] = createSignal(2)
  const [trimStart, setTrimStart] = createSignal(2)
  const [transition, setTransition] = createSignal(DEFAULT_TRANSITION)
  const [repeat, setRepeat] = createSignal(false)
  const [prompt, setPrompt] = createSignal(DEFAULT_PROMPT)
  const joining = useSoundJoining()
  const generate = () => {
    const firstFile = first()
    const secondFile = second()
    if (firstFile !== null && secondFile !== null) {
      return joining.generate({
        first: firstFile,
        prompt: prompt(),
        second: secondFile,
        transition: transition(),
        trimEnd: trimEnd(),
        trimStart: trimStart(),
      })
    }
  }
  return (
    <main class="min-h-dvh bg-#17131f px-5 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 소리 연결</Title>
      <div class="mx-auto max-w-4xl grid gap-6">
        <nav class="flex flex-wrap gap-5">
          <A href="/dev" class="text-#b8e8d0">
            ← 실험실
          </A>
          <A href="/dev/sound-generation" class="text-#b8e8d0">
            환경음 생성
          </A>
        </nav>
        <Introduction />
        <div class="grid gap-4 sm:grid-cols-2">
          <Source label="첫 번째 오디오" disabled={joining.busy()} onFile={setFirst} />
          <Source label="두 번째 오디오" disabled={joining.busy()} onFile={setSecond} />
        </div>
        <fieldset disabled={joining.busy()} class="m-0 grid gap-4 border-0 p-0 sm:grid-cols-3">
          <label class="grid gap-2 text-sm">
            첫 번째 끝에서 자르기 (초)
            <input
              class={INPUT}
              type="number"
              min="0"
              step="0.1"
              value={trimEnd()}
              onInput={(event) => setTrimEnd(event.currentTarget.valueAsNumber)}
            />
          </label>
          <label class="grid gap-2 text-sm">
            두 번째 시작에서 자르기 (초)
            <input
              class={INPUT}
              type="number"
              min="0"
              step="0.1"
              value={trimStart()}
              onInput={(event) => setTrimStart(event.currentTarget.valueAsNumber)}
            />
          </label>
          <label class="grid gap-2 text-sm">
            AI로 바꿀 연결 구간 (초)
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
        </fieldset>
        <p class="m-0 text-sm text-#bdb2c4 leading-6">
          잘라낸 뒤 각 파일에 6초 이상 남아 있어야 합니다. 연결 지점 양쪽의 일부를 AI로 교체하며
          나머지 원본은 유지합니다. 파일은 각각 10분 이하로 선택하세요.
        </p>
        <label class="grid gap-2">
          영어 소리 설명
          <textarea
            class={`${INPUT} min-h-28`}
            disabled={joining.busy()}
            value={prompt()}
            onInput={(event) => setPrompt(event.currentTarget.value)}
          />
        </label>
        <div class="flex gap-3">
          <button
            class="min-h-11 rounded-xl border-0 bg-#b8e8d0 px-6 text-#17131f font-700 disabled:opacity-50"
            type="button"
            disabled={
              joining.busy() || first() === null || second() === null || !isNonBlankString(prompt())
            }
            onClick={generate}
          >
            {joining.busy() ? '연결 생성 중…' : 'AI로 연결하기'}
          </button>
          <Show when={joining.busy()}>
            <button class={INPUT} type="button" onClick={joining.stop}>
              중지
            </button>
          </Show>
        </div>
        <p role="status" class="m-0 text-sm text-#bdb2c4">
          {joining.status()}
        </p>
        <Show when={joining.error()}>
          {(error) => (
            <p role="alert" class="text-#ffc0ce">
              {error()}
            </p>
          )}
        </Show>
        <Show when={joining.url()}>
          {(url) => (
            <section class="grid gap-3 border-t border-white/15 pt-5" aria-label="연결 결과">
              <h2 class="m-0 text-xl">연결 결과</h2>
              <audio
                aria-label="연결 결과 재생"
                class="w-full"
                src={url()}
                controls
                loop={repeat()}
              />
              <label class="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={repeat()}
                  onChange={(event) => setRepeat(event.currentTarget.checked)}
                />
                반복 재생
              </label>
              <a class="text-#b8e8d0 underline" href={url()} download="joined.wav">
                연결한 WAV 다운로드
              </a>
            </section>
          )}
        </Show>
        <p class="text-sm text-#bdb2c4">
          브라우저에서 처리하며 오디오 파일은 서버로 전송하지 않습니다. 첫 실행에는 생성 모델과 추가
          오디오 인코더를 내려받습니다. 연결 음질은 파일과 설명에 따라 달라집니다.
        </p>
        <ModelTerms />
      </div>
    </main>
  )
}
