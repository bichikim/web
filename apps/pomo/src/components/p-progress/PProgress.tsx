import {Progress} from '@kobalte/core/progress'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

export interface PProgressProps {
  readonly class?: string
  readonly label: string
  readonly presentation?: 'hidden' | 'bar'
  readonly value?: number
}

export const PProgress = (props: PProgressProps) => (
  <Progress
    class={cx(props.presentation === 'bar' ? 'grid min-w-0 gap-2' : 'sr-only', props.class)}
    indeterminate={props.value === undefined}
    maxValue={100}
    minValue={0}
    value={props.value}
  >
    <div class="flex items-center justify-between gap-3 text-sm">
      <Progress.Label class="min-w-0 font-600 text-foreground">{props.label}</Progress.Label>
      <Show when={props.presentation === 'bar' && props.value !== undefined}>
        <Progress.ValueLabel class="shrink-0 font-700 tabular-nums text-muted-foreground" />
      </Show>
    </div>
    <Show when={props.presentation === 'bar'}>
      <Progress.Track class="h-2 overflow-hidden rounded-full border border-border bg-surface-overlay">
        <Progress.Fill
          class={
            'h-full w-[var(--kb-progress-fill-width)] rounded-full bg-primary ' +
            'transition-[width] duration-200 ease-out motion-reduce:transition-none ' +
            'data-[indeterminate]:w-1/3 data-[indeterminate]:animate-pulse motion-reduce:animate-none'
          }
        />
      </Progress.Track>
    </Show>
  </Progress>
)
