import {cx} from 'class-variance-authority'
import {createMemo, For, type JSX, Show} from 'solid-js'

import {useTextMood} from '../features/text-mood'
import {TextMoodAnalysisResult} from './text-mood-lab/AnalysisResult'
import {TextMoodEvaluation} from './text-mood-lab/Evaluation'
import {TextMoodInsufficientResult} from './text-mood-lab/InsufficientResult'

const SAMPLE_TEXTS = [
  '창문을 여니 시원한 바람이 불어왔다. 오늘은 좋은 일이 생길 것 같다.',
  '와, 정말 완벽하게 해냈네. 파일을 전부 지워 버리다니.',
  '안개 속 숲에서는 이름 모를 빛들이 숨을 쉬듯 켜졌다 꺼졌다.',
  '회의는 오후 두 시에 시작하며 참석자는 회의실로 모이면 된다.',
] as const

const PANEL_CLASSES = cx(
  'w-full rounded-8 border border-white/10 bg-#211a2b/94 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl xs:p-8',
)
const TEXTAREA_CLASSES = cx(
  'min-h-44 w-full resize-y rounded-5 border border-white/10 bg-#17131f p-5',
  'text-base leading-7 text-#f8edf1 outline-none transition placeholder:text-#655b6c',
  'focus:border-#9ed6bb/65 xs:min-h-52 xs:text-lg xs:leading-8',
)
const PRIMARY_BUTTON_CLASSES = cx(
  'min-h-12 rounded-full border-0 bg-#9ed6bb px-6 text-sm font-800 text-#173126 transition',
  'hover:bg-#b8e8d0 disabled:cursor-not-allowed disabled:opacity-35',
)
const SECONDARY_BUTTON_CLASSES = cx(
  'min-h-12 rounded-full border border-white/12 bg-white/5 px-5 text-sm font-700 text-#d8cedd',
  'transition hover:border-white/25 hover:bg-white/9 disabled:cursor-not-allowed disabled:opacity-35',
)

export const TextMoodLab = () => {
  const mood = useTextMood({initialText: SAMPLE_TEXTS[0]})
  const analysis = createMemo(() => {
    const state = mood.state()
    return state.status === 'complete' ? state.analysis : null
  })
  const handleTextInput: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) => {
    mood.setText(event.currentTarget.value)
  }

  return (
    <section class={PANEL_CLASSES}>
      <header class="max-w-3xl">
        <p class="m-0 text-xs font-750 tracking-[0.24em] text-#9ed6bb uppercase">
          Korean text mood · On-device
        </p>
        <h1 class="mb-0 mt-3 text-3xl font-800 tracking--0.04em xs:text-5xl">
          문장의 분위기를 열두 갈래로 읽어요
        </h1>
        <p class="mb-0 mt-4 text-sm leading-6 text-#bdb2c4 xs:text-base xs:leading-7">
          MiniLM이 만든 384차원 의미 벡터를 직접 만든 한국어 분위기 분류기에 넣습니다. 입력은 서버로
          보내지 않으며 첫 실행 때만 모델 파일을 내려받아요.
        </p>
      </header>

      <div class="mt-8 grid gap-3">
        <label class="text-sm font-700 text-#e9dfe9" for="text-mood-input">
          분석할 문장
        </label>
        <textarea
          class={TEXTAREA_CLASSES}
          id="text-mood-input"
          onInput={handleTextInput}
          placeholder="한두 문단 이내의 한국어 문장을 입력해 보세요."
          value={mood.text()}
        />
        <div aria-label="예시 문장" class="flex flex-wrap gap-2">
          <For each={SAMPLE_TEXTS}>
            {(sample, index) => (
              <button
                class={cx(
                  'rounded-full border border-white/10 bg-white/4 px-3 py-2 text-left',
                  'text-xs leading-5 text-#aaa0b1 transition hover:border-#9ed6bb/35 hover:text-#d9f0e4',
                )}
                onClick={() => mood.setText(sample)}
                type="button"
              >
                예시 {index() + 1}
              </button>
            )}
          </For>
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-3">
          <button
            class={PRIMARY_BUTTON_CLASSES}
            disabled={!mood.canAnalyze()}
            onClick={mood.analyze}
            type="button"
          >
            분위기 분석하기
          </button>
          <button
            class={SECONDARY_BUTTON_CLASSES}
            disabled={mood.isBusy()}
            onClick={mood.prepare}
            type="button"
          >
            모델만 미리 준비
          </button>
          <p
            aria-live="polite"
            class={cx(
              'm-0 min-w-52 flex-1 text-xs leading-5 text-#8f8297',
              mood.state().status === 'error' && 'text-#ffb0bb',
            )}
          >
            {mood.statusMessage()}
          </p>
        </div>

        <Show when={mood.state().status === 'loading'}>
          <div
            aria-label={`모델 ${mood.progress()}% 준비됨`}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={mood.progress()}
            class="h-1.5 overflow-hidden rounded-full bg-white/8"
            role="progressbar"
          >
            <div
              class="h-full rounded-full bg-#9ed6bb transition-[width]"
              style={{width: `${mood.progress()}%`}}
            />
          </div>
        </Show>
      </div>

      <Show when={analysis()}>
        {(currentAnalysis) => <TextMoodAnalysisResult analysis={currentAnalysis()} />}
      </Show>
      <Show when={mood.state().status === 'insufficient'}>
        <TextMoodInsufficientResult />
      </Show>
      <TextMoodEvaluation />
    </section>
  )
}

export default TextMoodLab
