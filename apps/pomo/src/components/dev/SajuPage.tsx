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

interface CalculationSection {
  title: string
  value: string
}

const FIELD_CLASSES = cx(
  'min-h-11 w-full rounded-3 border border-white/20 bg-#211a2b px-3 text-#f8edf1',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#f0c99a',
)
const BUTTON_CLASSES = cx(
  'min-h-11 rounded-3 bg-#f0c99a px-5 font-750 text-#241927 hover:bg-#f8dcba',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
)
const JSON_CLASSES = cx(
  'mb-0 mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-3 bg-#100d16 p-4',
  'text-xs leading-6 text-#e8ddeb sm:text-sm',
)
const QUESTION_CLASSES = cx(
  'min-h-24 w-full rounded-3 border border-white/20 bg-#211a2b p-3 text-#f8edf1',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#f0c99a',
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

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) {
      return
    }

    const values = new FormData(form)
    const date = String(values.get('date') ?? '')
    const time = String(values.get('time') ?? '')
    const calendar = values.get('calendar') === 'lunar' ? 'lunar' : 'solar'
    const genderValue = values.get('gender')
    const gender = genderValue === 'F' || genderValue === 'N' ? genderValue : 'M'
    const question = String(values.get('question') ?? '').trim()

    setSections([])
    setGeneration(null)
    setFactAnswer(null)
    setError(null)
    setNotice(null)

    if (date < '1900-01-01' || date > '2050-12-31') {
      setError('생년월일은 1900년부터 2050년까지 입력해 주세요.')
      return
    }
    if (!question) {
      setError('해석할 질문을 입력해 주세요.')
      return
    }

    const birth: BirthInput = {calendar, date, ...(time ? {time} : {})}
    if (calendar === 'lunar') {
      birth.isLeapMonth = values.get('leapMonth') === 'on'
    }

    try {
      const result = calculateSections(birth, gender, question)
      setSections(result.sections)
      if (requiresAnnualReading(question)) {
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

        <form
          class="grid gap-4 rounded-6 border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <label class="grid gap-2 text-sm font-650">
            생년월일
            <input class={FIELD_CLASSES} name="date" required type="date" value="1995-03-16" />
          </label>
          <label class="grid gap-2 text-sm font-650">
            출생 시각 (모르면 비워두기)
            <input class={FIELD_CLASSES} name="time" type="time" value="07:30" />
          </label>
          <label class="grid gap-2 text-sm font-650">
            달력
            <select class={FIELD_CLASSES} name="calendar">
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-650">
            대운 계산 입력
            <select class={FIELD_CLASSES} name="gender">
              <option value="M">남성</option>
              <option value="F">여성</option>
              <option value="N">지정하지 않음 (대운 생략)</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm text-#d2c4d7">
            <input name="leapMonth" type="checkbox" />
            음력 윤달
          </label>
          <label class="grid gap-2 text-sm font-650 sm:col-span-2">
            질문
            <textarea
              class={QUESTION_CLASSES}
              name="question"
              placeholder="예: 제 성향을 어떻게 해석하나요?"
              required
            />
          </label>
          <button class={BUTTON_CLASSES} disabled={!ready()} type="submit">
            사주 풀이 생성
          </button>
        </form>

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
