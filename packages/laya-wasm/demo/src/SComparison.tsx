import {For, Show} from 'solid-js'
import type {Comparison} from './types'
import {answerLabel} from './answer-label'

export interface SComparisonProps {
  readonly comparison?: Comparison | null
}
const score = (comparison: Comparison): string | null => {
  const answer = comparison.after
  return answer.type === 'score' ? answer.score.toFixed(2) : null
}
const percentage = (value: number): string => {
  const scale = 100
  return `${(value * scale).toFixed(1)}%`
}

export const SComparison = (props: SComparisonProps) => (
  <section
    aria-labelledby="result-title"
    class="rounded-2xl border border-solid border-slate-200 bg-white p-6"
  >
    <div class="mb-5 flex items-center justify-between gap-3">
      <h2 id="result-title" class="m-0 text-lg font-700">
        판단 결과
      </h2>
      <Show when={props.comparison?.before}>
        <span class="rounded-full bg-teal-50 px-3 py-1 text-xs font-600 text-teal-800">
          학습 전·후 비교
        </span>
      </Show>
    </div>
    <Show
      when={props.comparison}
      fallback={
        <div class="flex min-h-52 flex-col items-center justify-center text-center text-slate-500">
          <span class="mb-3 text-3xl" aria-hidden="true">
            ↗
          </span>
          <p class="m-0 text-sm leading-relaxed">
            분류 지시문과 문장을 입력하고 추론을 실행하세요.
          </p>
        </div>
      }
    >
      {(comparison) => (
        <>
          <p class="mb-6 mt-0 break-words text-sm leading-relaxed text-slate-600">
            {comparison().prompt.state}
          </p>
          <div class="mb-3 grid grid-cols-[1fr_5rem_5rem] gap-2 text-right text-xs text-slate-500">
            <span class="text-left">선택지</span>
            <span>학습 전</span>
            <span>현재</span>
          </div>
          <For each={Object.entries(comparison().after.probabilities)}>
            {([label, probability]) => (
              <div class="mb-5">
                <div class="mb-2 grid grid-cols-[1fr_5rem_5rem] items-center gap-2 text-right text-sm">
                  <span class="break-words text-left font-600">
                    {answerLabel(label, comparison().prompt.question)}
                  </span>
                  <span class="text-slate-500">
                    {comparison().before === null
                      ? '—'
                      : percentage(comparison().before?.probabilities[label] ?? 0)}
                  </span>
                  <span class="font-700 text-teal-800">{percentage(probability)}</span>
                </div>
                <progress
                  aria-label={`${answerLabel(label, comparison().prompt.question)} 확률`}
                  max={1}
                  value={probability}
                  class="lab-progress h-2"
                />
              </div>
            )}
          </For>
          <Show when={score(comparison())}>
            {(value) => <p class="mb-0 text-sm text-slate-600">기대 점수: {value()}</p>}
          </Show>
        </>
      )}
    </Show>
  </section>
)
