import {Progress} from '@kobalte/core/progress'
import {cx} from 'class-variance-authority'

export interface PProgressProps {
  readonly class?: string
  readonly label: string
  readonly value?: number
}

export const PProgress = (props: PProgressProps) => (
  <Progress
    class={cx('sr-only', props.class)}
    indeterminate={props.value === undefined}
    maxValue={100}
    minValue={0}
    value={props.value}
  >
    <Progress.Label>{props.label}</Progress.Label>
  </Progress>
)
