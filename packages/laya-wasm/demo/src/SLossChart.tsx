import {Show} from 'solid-js'
import {lossPoints} from './loss-points'

export interface SLossChartProps {
  readonly losses?: readonly number[]
}
const precision = 3
export const SLossChart = (props: SLossChartProps) => (
  <Show when={(props.losses?.length ?? 0) > 0}>
    <div class="mt-5 border-0 border-t border-solid border-slate-100 pt-4">
      <div class="flex items-center justify-between text-xs text-slate-600">
        <span>단계별 손실</span>
        <span>마지막 단계 {props.losses?.at(-1)?.toFixed(precision)}</span>
      </div>
      <svg
        viewBox="0 0 320 96"
        role="img"
        aria-label="학습 단계별 손실 그래프"
        class="mt-3 h-24 w-full overflow-visible"
      >
        <polyline
          points={lossPoints(props.losses ?? [])}
          class="fill-none stroke-teal-700 stroke-2"
        />
      </svg>
    </div>
  </Show>
)
