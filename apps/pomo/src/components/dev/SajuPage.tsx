import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {
  analyzeDaeun,
  analyzeElements,
  analyzeSipseong,
  type BirthInput,
  deriveSaju,
  ENGINE_VERSION,
  iljuInfo,
} from 'k-saju'
import {createSignal, For, onMount, Show} from 'solid-js'
import {createMessages} from './saju/create-messages'
import {GenerationWorkspace} from './saju/GenerationWorkspace'
import {getBroadFutureAnswer} from './saju/get-broad-future-answer'
import {getDayPillarFactAnswer} from './saju/get-day-pillar-fact-answer'
import {getReadableFallback} from './saju/get-readable-fallback'
import type {GenerateSajuRequest} from './saju/messages'
import {requiresAnnualReading} from './saju/requires-annual-reading'
import {SajuForm, type SajuFormInput} from './saju/SajuForm'

interface CalculationSection {
  title: string
  value: string
}

const MINIMUM_BIRTH_DATE = '1900-01-01'
const MAXIMUM_BIRTH_DATE = '2050-12-31'
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

function FactAnswer(props: {readonly answer: string}) {
  return (
    <section aria-label="계산값 답변" class="rounded-5 border border-white/10 bg-white/5 p-5">
      <h2 class="m-0 text-lg font-750">사주 답변</h2>
      <p class="mb-0 mt-3 whitespace-pre-wrap text-sm leading-7">{props.answer}</p>
    </section>
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

function calculateSections(birth: BirthInput, gender: 'M' | 'F' | 'N', question: string) {
  const chart = deriveSaju(birth)
  const elements = analyzeElements(chart)
  const sipseong = analyzeSipseong(chart)
  const ilju = iljuInfo(chart)
  const daeun = gender === 'N' ? null : analyzeDaeun(birth, chart, gender)
  const messages = createMessages({birth, chart, daeun, elements, ilju, question, sipseong})

  return {
    factAnswer: getDayPillarFactAnswer(question, chart) ?? getBroadFutureAnswer(question),
    generation: {
      facts: {birthYear: Number(birth.date.split('-')[0])},
      fallbackAnswer: getReadableFallback(question, sipseong.counts),
      messages,
      type: 'generate',
    } satisfies GenerateSajuRequest,
    sections: [
      formatResult('사주팔자 · deriveSaju()', chart),
      formatResult('오행 · analyzeElements()', elements),
      formatResult('십성 · analyzeSipseong()', sipseong),
      formatResult('일주 · iljuInfo()', ilju),
      formatResult('대운 · analyzeDaeun()', daeun),
    ],
  }
}

export function SajuPage() {
  const [ready, setReady] = createSignal(false)
  const [sections, setSections] = createSignal<CalculationSection[]>([])
  const [generation, setGeneration] = createSignal<GenerateSajuRequest | null>(null)
  const [factAnswer, setFactAnswer] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [notice, setNotice] = createSignal<string | null>(null)

  onMount(() => setReady(true))

  function handleSubmit(input: SajuFormInput) {
    setSections([])
    setGeneration(null)
    setFactAnswer(null)
    setError(null)
    setNotice(null)

    if (input.birth.date === '') {
      setError('생년월일을 선택해 주세요.')
      return
    }
    if (input.birth.date < MINIMUM_BIRTH_DATE || input.birth.date > MAXIMUM_BIRTH_DATE) {
      setError('생년월일은 1900년부터 2050년까지 입력해 주세요.')
      return
    }
    if (!input.question) {
      setError('해석할 질문을 입력해 주세요.')
      return
    }

    try {
      const result = calculateSections(input.birth, input.gender, input.question)
      setSections(result.sections)
      if (requiresAnnualReading(input.question)) {
        setNotice('특정 연도 운세는 계산하지 않아요. 연도를 빼고 다시 질문해 주세요.')
      } else if (result.factAnswer === null) {
        setGeneration(result.generation)
      } else {
        setFactAnswer(result.factAnswer)
      }
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
        <Show when={notice()}>
          <p class="m-0 rounded-3 border border-#f0c99a/50 bg-#f0c99a/10 p-4 text-sm" role="note">
            {notice()}
          </p>
        </Show>
        <Show when={factAnswer()}>{(answer) => <FactAnswer answer={answer()} />}</Show>
        <Show when={sections().length > 0}>
          <Show keyed when={generation()}>
            {(value) => (
              <GenerationWorkspace
                facts={value.facts}
                fallbackAnswer={value.fallbackAnswer}
                messages={value.messages}
              />
            )}
          </Show>
          <Show when={generation()}>
            <section
              aria-label="LLM 전달 값"
              class="min-w-0 rounded-5 border border-#f0c99a/35 bg-#f0c99a/5 p-5"
            >
              <h2 class="m-0 text-lg font-750">LLM 전달 값</h2>
              <p class="mb-0 mt-2 text-sm leading-6 text-#cbbfd0">
                사주 풀이 생성에 사용하는 실제 메시지입니다. 질문에 필요한 계산 결과와 용어 설명을
                담았습니다.
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
