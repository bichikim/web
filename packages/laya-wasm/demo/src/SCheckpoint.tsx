import {createEffect, type JSX, onCleanup} from 'solid-js'
import {checkpointBlob, parseCheckpointFile} from './checkpoint-file'
import type {Lab} from './use-lab'
export interface SCheckpointProps {
  readonly lab: Lab
}
export const SCheckpoint = (props: SCheckpointProps) => {
  const handleImport: JSX.EventHandler<HTMLInputElement, Event> = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (file === undefined) {
      return
    }
    try {
      props.lab.restore(parseCheckpointFile(await file.text()))
    } catch (cause) {
      props.lab.reportError(cause)
    } finally {
      input.value = ''
    }
  }
  createEffect(() => {
    const checkpoint = props.lab.exported()
    if (checkpoint === null) {
      return
    }
    const url = URL.createObjectURL(checkpointBlob(checkpoint))
    const link = document.createElement('a')
    link.href = url
    link.download = 'laya-checkpoint.json'
    link.click()
    onCleanup(() => URL.revokeObjectURL(url))
  })
  return (
    <section aria-labelledby="checkpoint-title" class="lab-card">
      <div class="mb-4 flex items-center justify-between">
        <h2 id="checkpoint-title" class="m-0 text-base font-700">
          학습 가중치
        </h2>
        <span class="text-xs text-slate-500">누적 {props.lab.steps()} 단계</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => props.lab.exportCheckpoint()}
          disabled={!props.lab.loaded() || props.lab.busy()}
          class="lab-button"
        >
          다운로드
        </button>
        <label
          class="lab-button relative overflow-hidden focus-within:ring-3 focus-within:ring-teal-500"
          classList={{'opacity-45': !props.lab.loaded() || props.lab.busy()}}
        >
          파일 불러오기
          <input
            aria-label="체크포인트 파일 불러오기"
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            disabled={!props.lab.loaded() || props.lab.busy()}
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => props.lab.reset()}
        disabled={!props.lab.loaded() || props.lab.busy() || props.lab.steps() === 0}
        class="lab-reset"
      >
        초기 가중치 복원
      </button>
    </section>
  )
}
