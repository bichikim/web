import {type JSX} from 'solid-js'
import type {Lab} from './use-lab'
import {SAccuracyComparison} from './SAccuracyComparison'

export interface SEvaluationProps {
  readonly lab: Lab
}
export const SEvaluation = (props: SEvaluationProps) => {
  const handleFile: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (file !== undefined) {
      await props.lab.evaluation.importFile(file)
      input.value = ''
    }
  }
  return (
    <section aria-labelledby="evaluation-title" class="lab-card">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h2 id="evaluation-title" class="m-0 text-lg font-700">
          04 · 정확도 평가
        </h2>
        <span aria-label="평가 예제 수" class="text-xs text-slate-500">
          {props.lab.evaluation.examples().length}개
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="lab-button"
          disabled={props.lab.busy() || props.lab.evaluation.importing()}
          onClick={() => props.lab.evaluation.loadSample()}
        >
          {props.lab.evaluation.importing() ? '가져오는 중…' : '평가용 30개 불러오기'}
        </button>
        <button
          type="button"
          class="lab-button"
          disabled={props.lab.busy() || props.lab.evaluation.importing()}
          onClick={() =>
            props.lab.evaluation.loadSample('/datasets/generalization/evaluation.jsonl')
          }
        >
          새 평가 30개 불러오기
        </button>
        <label
          class="lab-button relative overflow-hidden focus-within:ring-3 focus-within:ring-teal-500"
          classList={{'opacity-45': props.lab.busy() || props.lab.evaluation.importing()}}
        >
          평가 JSONL 가져오기
          <input
            aria-label="평가 JSONL 파일 가져오기"
            type="file"
            accept=".jsonl,application/jsonl,application/x-ndjson,text/plain"
            onChange={handleFile}
            disabled={props.lab.busy() || props.lab.evaluation.importing()}
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <button
          type="button"
          class="lab-reset"
          onClick={() => props.lab.evaluation.clear()}
          disabled={
            props.lab.busy() ||
            props.lab.evaluation.importing() ||
            props.lab.evaluation.examples().length === 0
          }
        >
          평가 비우기
        </button>
      </div>
      <p class="mb-0 mt-3 text-xs leading-relaxed text-slate-500">
        학습 버튼을 누르면 전후 정확도를 비교합니다. 평가 예제는 학습에 사용하지 않습니다.
      </p>
      <SAccuracyComparison comparison={props.lab.evaluationResult()} />
    </section>
  )
}
