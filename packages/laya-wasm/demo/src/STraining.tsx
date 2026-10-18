import {createSignal, type JSX, Show} from 'solid-js'
import {SLossChart} from './SLossChart'
import type {Lab} from './use-lab'
import type {Editor} from './use-editor'
import type {TrainingOutcome} from './session'
export interface TrainingLab extends Pick<
  Lab,
  | 'busy'
  | 'cancel'
  | 'cancelling'
  | 'dataset'
  | 'evaluationProgress'
  | 'loaded'
  | 'losses'
  | 'outcome'
  | 'phase'
  | 'reportError'
  | 'total'
  | 'train'
> {
  readonly evaluation: Pick<Lab['evaluation'], 'importing'>
}
export interface STrainingProps {
  readonly lab: TrainingLab
  readonly editor: Pick<Editor, 'prompt'>
}
const outcomeLabels: Readonly<Record<TrainingOutcome, string>> = {
  cancelled: '학습 중지됨',
  completed: '학습 완료',
  failed: '학습 실패',
  idle: '',
  running: '학습 진행',
}
export const STraining = (props: STrainingProps) => {
  const [epochs, setEpochs] = createSignal('5')
  const [rate, setRate] = createSignal('0.001')
  const handleEpochs: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    setEpochs(event.currentTarget.value)
  const handleRate: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    setRate(event.currentTarget.value)
  const handlePreset = (): void => {
    setEpochs('100')
    setRate('0.1')
  }
  const handleTrain = (): void => {
    try {
      props.lab.train(props.editor.prompt(), Number(epochs()), Number(rate()))
    } catch (cause) {
      props.lab.reportError(cause)
    }
  }
  return (
    <section aria-labelledby="training-title" class="lab-card">
      <div class="mb-5 flex items-center justify-between">
        <h2 id="training-title" class="m-0 text-lg font-700">
          03 · 브라우저 학습
        </h2>
        <span class="text-xs text-slate-500">점수 계산층 · SGD</span>
      </div>
      <button
        type="button"
        class="lab-reset mb-4 text-xs"
        onClick={handlePreset}
        disabled={props.lab.busy()}
      >
        한국어 90개 실험 설정 · 0.1 / 100회
      </button>
      <div class="mb-5 grid grid-cols-2 gap-4">
        <div>
          <label for="epochs" class="lab-label">
            반복 횟수
          </label>
          <input
            id="epochs"
            type="number"
            min={1}
            max={1000}
            step={1}
            value={epochs()}
            onInput={handleEpochs}
            disabled={props.lab.busy()}
            class="lab-input"
          />
        </div>
        <div>
          <label for="rate" class="lab-label">
            학습률
          </label>
          <input
            id="rate"
            type="number"
            min="0.000001"
            step="0.001"
            value={rate()}
            onInput={handleRate}
            disabled={props.lab.busy()}
            class="lab-input"
          />
        </div>
      </div>
      <Show
        when={props.lab.phase() === 'training'}
        fallback={
          <button
            type="button"
            onClick={handleTrain}
            disabled={
              !props.lab.loaded() ||
              props.lab.busy() ||
              props.lab.evaluation.importing() ||
              props.lab.dataset().length === 0
            }
            class="lab-primary w-full"
          >
            학습하고 결과 비교
          </button>
        }
      >
        <button
          type="button"
          onClick={() => props.lab.cancel()}
          disabled={props.lab.cancelling()}
          class="lab-button w-full"
        >
          {props.lab.cancelling() ? '중지 중…' : '학습 중지'}
        </button>
      </Show>
      <Show when={props.lab.evaluationProgress()}>
        {(progress) => (
          <p role="status" class="mb-0 mt-4 text-sm text-slate-600">
            {progress().stage === 'before' ? '학습 전 평가' : '학습 후 평가'} {progress().completed}
            /{progress().total}
          </p>
        )}
      </Show>
      <Show when={props.lab.total() > 0}>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-600">
          <span>{outcomeLabels[props.lab.outcome()]}</span>
          <span>
            {props.lab.losses().length} / {props.lab.total()} 단계
          </span>
        </div>
        <progress
          aria-label="학습 진행률"
          max={props.lab.total()}
          value={props.lab.losses().length}
          class="lab-progress mt-2 h-1.5"
        />
      </Show>
      <SLossChart losses={props.lab.losses()} />
      <p class="mb-0 mt-4 text-xs leading-relaxed text-slate-500">
        언어 인코더는 고정하고 점수 계산층을 학습합니다.
      </p>
    </section>
  )
}
