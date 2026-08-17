import {Switch} from '@kobalte/core/switch'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

export interface PSwitchProps {
  readonly checked: boolean
  readonly class?: string
  readonly description?: string
  readonly disabled?: boolean
  readonly label: string
  readonly onChange: (isChecked: boolean) => void
}

export const PSwitch = (props: PSwitchProps) => (
  <Switch
    checked={props.checked}
    class={cx(
      'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 ui-disabled:opacity-45',
      props.class,
    )}
    disabled={props.disabled}
    onChange={props.onChange}
  >
    <div class="min-w-0">
      <Switch.Label
        class={cx(
          'block w-fit cursor-pointer text-[0.9375rem] font-700 leading-[1.375rem] ' +
            'text-foreground',
          props.disabled && 'cursor-not-allowed',
        )}
      >
        {props.label}
      </Switch.Label>
      <Show when={props.description}>
        {(description) => (
          <Switch.Description class="mt-1 text-xs leading-[1.125rem] text-muted-foreground empty:hidden">
            {description()}
          </Switch.Description>
        )}
      </Show>
    </div>
    <Switch.Input />
    <Switch.Control
      class={cx(
        'relative box-border h-7 w-12 cursor-pointer border border-solid ' +
          'border-border-hover rounded-control ' +
          'bg-[rgb(255_250_241_/_12%)] outline-none ' +
          'transition-[border-color_160ms_ease,background-color_160ms_ease] ' +
          'ui-checked:border-primary ui-checked:bg-primary ' +
          'focus-visible:shadow-focus motion-reduce:transition-none',
        props.disabled && 'cursor-not-allowed',
      )}
    >
      <Switch.Thumb
        class={
          'absolute left-0.75 top-0.75 size-5 translate-x-0 rounded-full bg-foreground ' +
          'shadow-[0_2px_6px_rgb(8_6_4_/_35%)] ' +
          'transition-transform duration-180 ease-[cubic-bezier(0.2,0.8,0.2,1)] ' +
          'ui-checked:translate-x-5 motion-reduce:transition-none'
        }
      />
    </Switch.Control>
  </Switch>
)
