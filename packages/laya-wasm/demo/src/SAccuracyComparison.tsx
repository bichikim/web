import {For, Show} from 'solid-js'
import type {EvaluationComparison, EvaluationScore} from './types'

export interface SAccuracyComparisonProps {
  readonly comparison?: EvaluationComparison | null
}
const lossPrecision = 4
const percentageScale = 100
const accuracy = (score: EvaluationScore): number =>
  score.total === 0 ? 0 : (score.correct / score.total) * percentageScale
const summary = (score: EvaluationScore): string =>
  `${accuracy(score).toFixed(1)}% (${score.correct}/${score.total})`
const difference = (comparison: EvaluationComparison): string => {
  const change = accuracy(comparison.after) - accuracy(comparison.before)
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%p`
}
export const SAccuracyComparison = (props: SAccuracyComparisonProps) => (
  <Show when={props.comparison}>
    {(comparison) => (
      <div class="mt-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p class="mb-1 mt-0 text-sm text-slate-500">학습 전</p>
            <output aria-label="학습 전 정확도" class="break-words text-xl font-800">
              {summary(comparison().before)}
            </output>
            <p class="mb-0 mt-1 text-xs text-slate-600">
              평균 손실{' '}
              <output aria-label="학습 전 평균 손실">
                {comparison().before.meanLoss?.toFixed(lossPrecision) ?? '—'}
              </output>
            </p>
          </div>
          <div>
            <p class="mb-1 mt-0 text-sm text-slate-500">학습 후</p>
            <output aria-label="학습 후 정확도" class="break-words text-xl font-800 text-teal-800">
              {summary(comparison().after)}
            </output>
            <p class="mb-0 mt-1 text-xs text-slate-600">
              평균 손실{' '}
              <output aria-label="학습 후 평균 손실">
                {comparison().after.meanLoss?.toFixed(lossPrecision) ?? '—'}
              </output>
            </p>
          </div>
        </div>
        <p class="mb-0 mt-3 text-sm font-600">
          정확도 변화 <output aria-label="정확도 변화">{difference(comparison())}</output>
        </p>
        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-600">
            문장별 결과 ({comparison().after.total}개)
          </summary>
          <div class="mt-3 max-h-96 overflow-auto">
            <table
              aria-label="평가 문장별 결과"
              class="w-full border-collapse text-left text-xs leading-relaxed"
            >
              <thead>
                <tr>
                  <th class="p-2">문장</th>
                  <th class="p-2">정답</th>
                  <th class="p-2">학습 전</th>
                  <th class="p-2">학습 후</th>
                </tr>
              </thead>
              <tbody>
                <For each={comparison().after.rows}>
                  {(row, index) => (
                    <tr class="border-0 border-t border-solid border-slate-100">
                      <td class="min-w-36 p-2">{row.state}</td>
                      <td class="p-2">{row.expected}</td>
                      <td class="p-2">
                        {comparison().before.rows[index()].predicted}
                        <br />
                        {comparison().before.rows[index()].correct ? '맞음' : '틀림'}
                      </td>
                      <td
                        class="p-2"
                        classList={{'text-red-700': !row.correct, 'text-teal-800': row.correct}}
                      >
                        {row.predicted}
                        <br />
                        {row.correct ? '맞음' : '틀림'}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    )}
  </Show>
)
