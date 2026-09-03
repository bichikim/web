import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {type TextModelDefinition} from '../../features/text-generation/index'

interface ModelStatusProps {
  readonly model: TextModelDefinition
  readonly percentage: number
  readonly status:
    | 'complete'
    | 'error'
    | 'generating'
    | 'idle'
    | 'loading'
    | 'ready'
    | 'unsupported'
  readonly statusMessage: string
}

export const ModelStatus = (props: ModelStatusProps) => (
  <div aria-live="polite" class="rounded-4 border border-white/8 bg-white/4 p-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5 text-sm">
        <span
          class={cx(
            'h-2 w-2 rounded-full',
            props.status === 'ready' || props.status === 'complete'
              ? 'bg-#9ed6bb'
              : props.status === 'error' || props.status === 'unsupported'
                ? 'bg-#ff9aa8'
                : 'bg-#f2a7b8',
          )}
        />
        <span class="font-650 text-#eee5ef">{props.model.label} · WebGPU</span>
      </div>
      <span class="text-xs text-#9f93a7">
        {props.status === 'loading' ? `${props.percentage}%` : props.model.downloadSize}
      </span>
    </div>
    <Show when={props.status === 'loading'}>
      <div
        aria-label={`모델 준비 ${props.percentage}%`}
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={props.percentage}
        class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
      >
        <div
          class="h-full rounded-full bg-#9ed6bb [width:var(--pomo-progress-width)] transition-[width]"
          style={{'--pomo-progress-width': `${props.percentage}%`}}
        />
      </div>
    </Show>
    <p
      class={cx(
        'mb-0 mt-2 text-xs leading-5',
        props.status === 'error' || props.status === 'unsupported'
          ? 'text-#ff9aa8'
          : 'text-#9f93a7',
      )}
    >
      {props.statusMessage}
    </p>
  </div>
)
