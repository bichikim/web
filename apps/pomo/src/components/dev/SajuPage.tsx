import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {ENGINE_VERSION, iljuInfo} from 'k-saju'
import {createSignal, For, onMount, Show} from 'solid-js'
import {calculateSajuReading} from 'src/features/saju/calculate-reading'
import type {GenerateSajuRequest} from 'src/features/saju/messages'
import {GenerationWorkspace} from './saju/GenerationWorkspace'
import {SajuForm, type SajuFormInput} from '../saju/SajuForm'

interface CalculationSection {
  title: string
  value: string
}

const JSON_CLASSES = cx(
  'mb-0 mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-3 bg-#100d16 p-4',
  'text-xs leading-6 text-#e8ddeb sm:text-sm',
)
function formatResult(title: string, value: unknown): CalculationSection {
  return {title, value: JSON.stringify(value, null, 2)}
}

function CalculationResults(props: {readonly sections: ReadonlyArray<CalculationSection>}) {
  return (
    <div class="grid gap-4">
      <For each={props.sections}>
        {(section) => (
          <section class="min-w-0 rounded-5 border border-white/10 bg-white/5 p-5">
            <h2 class="m-0 text-lg font-750">{section.title}</h2>
            <pre class={JSON_CLASSES}>
              <code>{section.value}</code>
            </pre>
          </section>
        )}
      </For>
    </div>
  )
}

function SajuIntro() {
  return (
    <header>
      <h1 class="m-0 text-3xl font-800 sm:text-4xl">사주 풀이 실험실</h1>
      <p class="mb-0 mt-4 max-w-2xl text-sm leading-7 text-#cbbfd0">
        생년월일시와 질문을 입력하면 사주를 계산하고 풀이를 생성합니다. 출생 시각은 한국 표준시
        기준이며, 시각을 비우면 시주는 계산하지 않습니다.
      </p>
    </header>
  )
}

export function SajuPage() {
  const [ready, setReady] = createSignal(false)
  const [sections, setSections] = createSignal<CalculationSection[]>([])
  const [generation, setGeneration] = createSignal<GenerateSajuRequest | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  onMount(() => setReady(true))

  function handleSubmit(input: SajuFormInput) {
    setSections([])
    setGeneration(null)
    setError(null)

    try {
      const {calculation, request} = calculateSajuReading(input)
      const {chart, daeun, elements, sipseong} = calculation
      setSections([
        formatResult('사주팔자 · deriveSaju()', chart),
        formatResult('오행 · analyzeElements()', elements),
        formatResult('십성 · analyzeSipseong()', sipseong),
        formatResult('일주 · iljuInfo()', iljuInfo(chart)),
        formatResult('대운 · analyzeDaeun()', daeun),
      ])
      setGeneration(request)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사주 계산에 실패했습니다.')
    }
  }

  return (
    <main class="min-h-dvh bg-#17131f px-4 py-8 text-#f8edf1 sm:px-8 sm:py-12">
      <Title>Pomofi — 사주 풀이 실험실</Title>
      <div class="mx-auto grid w-full max-w-5xl gap-8">
        <A class="w-fit text-sm text-#d2c4d7 no-underline hover:text-white" href="/dev">
          ← 실험실 목록
        </A>
        <SajuIntro />

        <SajuForm onSubmit={handleSubmit} ready={ready()} />

        <Show when={error()}>
          <p class="m-0 rounded-3 border border-#f2a7b8/50 bg-#f2a7b8/10 p-4 text-sm" role="alert">
            {error()}
          </p>
        </Show>
        <Show when={sections().length > 0}>
          <Show keyed when={generation()}>
            {(value) => <GenerationWorkspace messages={value.messages} />}
          </Show>
          <Show when={generation()}>
            <section
              aria-label="LLM 전달 값"
              class="min-w-0 rounded-5 border border-#f0c99a/35 bg-#f0c99a/5 p-5"
            >
              <h2 class="m-0 text-lg font-750">LLM 전달 값</h2>
              <p class="mb-0 mt-2 text-sm leading-6 text-#cbbfd0">
                질문 원문과 사주 계산값을 모델에 전달합니다.
              </p>
              <pre class={JSON_CLASSES}>
                <code>{JSON.stringify(generation()?.messages, null, 2)}</code>
              </pre>
            </section>
          </Show>
          <p class="m-0 text-sm text-#cbbfd0" role="status">
            아래 JSON은 계산 엔진 k-saju {ENGINE_VERSION}의 원본 반환값입니다.
          </p>
          <CalculationResults sections={sections()} />
        </Show>
      </div>
    </main>
  )
}
