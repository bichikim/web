import {createSignal, For, type JSX, Show} from 'solid-js'
import type {Lab} from './use-lab'
import type {Phase} from './types'
export interface SModelConnectionProps {
  readonly lab: Pick<Lab, 'busy' | 'disconnect' | 'load' | 'loaded' | 'phase' | 'reportError'>
}
const models = [
  {label: '다국어', url: '/models/laya-multilingual/'},
  {label: '영문', url: '/models/laya/'},
] as const
const phaseLabels: Readonly<Record<Phase, string>> = {
  exporting: '체크포인트 만드는 중',
  idle: '모델 미연결',
  inferring: '추론 중',
  loading: '모델 불러오는 중',
  ready: '모델 준비됨',
  restoring: '가중치 적용 중',
  training: '학습 중',
}

export const SModelConnection = (props: SModelConnectionProps) => {
  const [modelUrl, setModelUrl] = createSignal('/models/laya-multilingual/')
  const handleLoad = (): void => {
    try {
      props.lab.load(modelUrl())
    } catch (cause) {
      props.lab.reportError(cause)
    }
  }
  const handleModel: JSX.EventHandler<HTMLInputElement, Event> = (event) =>
    setModelUrl(event.currentTarget.value)
  return (
    <section aria-label="모델 연결" class="lab-card mb-6">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="model-selection" class="m-0 text-sm font-700">
          모델 선택
        </h2>
        <span role="status" class="text-xs font-600 text-teal-800">
          {phaseLabels[props.lab.phase()]}
        </span>
      </div>
      <div class="flex flex-col gap-3 md:flex-row">
        <div
          role="radiogroup"
          aria-labelledby="model-selection"
          class="flex flex-1 gap-1 rounded-xl bg-slate-100 p-1"
        >
          <For each={models}>
            {(model) => (
              <label
                class="lab-button relative flex-1 border-0 px-5 focus-within:ring-2 focus-within:ring-teal-500"
                classList={{
                  'bg-teal-700': modelUrl() === model.url,
                  'hover:bg-teal-800': modelUrl() === model.url,
                  'opacity-45': props.lab.phase() !== 'idle',
                  'text-slate-600': modelUrl() !== model.url,
                  'text-white': modelUrl() === model.url,
                }}
              >
                <input
                  type="radio"
                  name="laya-model"
                  value={model.url}
                  checked={modelUrl() === model.url}
                  onChange={handleModel}
                  disabled={props.lab.phase() !== 'idle'}
                  class="sr-only"
                />
                {model.label}
              </label>
            )}
          </For>
        </div>
        <Show
          when={props.lab.loaded()}
          fallback={
            <button
              type="button"
              onClick={handleLoad}
              disabled={props.lab.busy()}
              class="lab-primary shrink-0"
            >
              모델 불러오기
            </button>
          }
        >
          <button
            type="button"
            onClick={() => props.lab.disconnect()}
            disabled={props.lab.busy()}
            class="lab-button shrink-0"
          >
            연결 해제
          </button>
        </Show>
      </div>
      <Show when={!props.lab.loaded()}>
        <p class="mb-0 mt-3 text-xs leading-relaxed text-slate-500">
          {modelUrl() === '/models/laya-multilingual/'
            ? '한국어를 포함한 다국어 모델 · 약 1.3 GB'
            : '영문 모델 · 약 1.7 GB'}
        </p>
      </Show>
    </section>
  )
}
