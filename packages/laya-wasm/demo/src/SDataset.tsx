import {createSignal, For, type JSX, Show} from 'solid-js'
import {STrainingGuide} from './STrainingGuide'
import {serializeState} from '../../src/sequence'
import type {Lab} from './use-lab'
import type {Editor} from './use-editor'
export interface SDatasetProps {
  readonly lab: Lab
  readonly editor: Editor
}
export const SDataset = (props: SDatasetProps) => {
  const [target, setTarget] = createSignal(1)
  const [importing, setImporting] = createSignal(false)
  const handleTarget: JSX.EventHandler<HTMLSelectElement, Event> = (event) =>
    setTarget(Number(event.currentTarget.value))
  const handleAdd = (): void => {
    try {
      props.lab.addExample(props.editor.prompt(), target())
    } catch (cause) {
      props.lab.reportError(cause)
    }
  }
  const handleImport: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (file === undefined) {
      return
    }
    setImporting(true)
    try {
      props.lab.importExamples(await file.text())
    } catch (cause) {
      props.lab.reportError(cause)
    } finally {
      input.value = ''
      setImporting(false)
    }
  }
  return (
    <section aria-labelledby="dataset-title" class="lab-card">
      <div class="mb-5 flex items-center justify-between">
        <h2 id="dataset-title" class="m-0 text-lg font-700">
          02 · 정답 예제
        </h2>
        <span class="text-xs text-slate-500">{props.lab.dataset().length}개</span>
      </div>
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <label
          class="lab-button relative overflow-hidden focus-within:ring-3 focus-within:ring-teal-500"
          classList={{'opacity-45': props.lab.busy() || importing()}}
        >
          {importing() ? '가져오는 중…' : 'JSONL 가져오기'}
          <input
            aria-label="학습 JSONL 파일 가져오기"
            type="file"
            accept=".jsonl,application/jsonl,application/x-ndjson,text/plain"
            disabled={props.lab.busy() || importing()}
            onChange={handleImport}
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <a
          href="/training.jsonl"
          download="training.jsonl"
          class="text-xs text-teal-800 underline underline-offset-3"
        >
          형식 예제
        </a>
        <a
          href="/datasets/banking77/train.jsonl"
          download="banking77-ko-train.jsonl"
          class="text-xs text-teal-800 underline underline-offset-3"
        >
          한글 학습 90개
        </a>
        <a
          href="/datasets/context/train.jsonl"
          download="context-ko-train.jsonl"
          class="text-xs text-teal-800 underline underline-offset-3"
        >
          문맥 학습 60개
        </a>
        <a
          href="/datasets/banking77/evaluation.jsonl"
          download="banking77-ko-evaluation.jsonl"
          class="text-xs text-teal-800 underline underline-offset-3"
        >
          한글 평가 30개
        </a>
        <a
          href="/datasets/generalization/evaluation.jsonl"
          download="generalization-ko-evaluation.jsonl"
          class="text-xs text-teal-800 underline underline-offset-3"
        >
          새 평가 30개
        </a>
        <a
          href="/datasets/banking77/README.md"
          class="text-xs text-slate-500 underline underline-offset-3"
        >
          데이터 출처
        </a>
      </div>
      <STrainingGuide />
      <label for="target" class="lab-label">
        현재 입력의 정답
      </label>
      <div class="flex flex-col gap-3 md:flex-row">
        <select
          id="target"
          value={String(target())}
          onChange={handleTarget}
          disabled={props.lab.busy() || importing()}
          class="lab-input min-w-0 flex-1"
        >
          <For each={props.editor.labels()}>
            {(label, index) => <option value={index()}>{label}</option>}
          </For>
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={props.lab.busy() || importing()}
          class="lab-button shrink-0"
        >
          예제 추가
        </button>
      </div>
      <Show when={props.lab.dataset().length > 0}>
        <ul aria-label="학습 예제" class="mb-0 mt-5 max-h-80 list-none overflow-y-auto p-0">
          <For each={props.lab.dataset()}>
            {(entry) => (
              <li class="flex items-center gap-3 border-0 border-t border-solid border-slate-100 py-3 text-sm">
                <span class="min-w-0 flex-1 truncate" title={serializeState(entry.example.state)}>
                  {serializeState(entry.example.state)}
                </span>
                <span
                  class="max-w-24 truncate rounded bg-teal-50 px-2 py-1 text-xs font-600 text-teal-900"
                  title={entry.label}
                >
                  {entry.label}
                </span>
                <button
                  type="button"
                  aria-label={`예제 ${entry.id} 삭제`}
                  disabled={props.lab.busy() || importing()}
                  onClick={() => props.lab.removeExample(entry.id)}
                  class="cursor-pointer border-0 bg-transparent p-1 font-inherit text-slate-500 hover:text-red-700"
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  )
}
