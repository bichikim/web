import {TextField} from '@kobalte/core/text-field'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

export interface PTextFieldProps {
  readonly autoComplete?: string
  readonly class?: string
  readonly description?: string
  readonly disabled?: boolean
  readonly errorMessage?: string
  readonly inputMode?: 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url'
  readonly label: string
  readonly name?: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly readOnly?: boolean
  readonly required?: boolean
  readonly type?: 'email' | 'password' | 'search' | 'tel' | 'text' | 'url'
  readonly value: string
}

export const PTextField = (props: PTextFieldProps) => (
  <TextField
    class={cx('grid w-full gap-2', props.class)}
    disabled={props.disabled}
    name={props.name}
    onChange={props.onChange}
    readOnly={props.readOnly}
    required={props.required}
    validationState={props.errorMessage === undefined ? undefined : 'invalid'}
    value={props.value}
  >
    <TextField.Label class="w-fit text-sm font-650 text-foreground">{props.label}</TextField.Label>
    <TextField.Input
      autocomplete={props.autoComplete}
      class={cx(
        'box-border min-h-control-md w-full rounded-control border border-solid border-border',
        'bg-black/20 px-4 text-base text-foreground outline-none',
        'transition-[border-color_160ms_ease,box-shadow_160ms_ease]',
        'placeholder:text-muted-foreground focus-visible:border-highlight focus-visible:shadow-focus',
        'ui-invalid:border-danger ui-disabled:cursor-not-allowed ui-disabled:opacity-50',
        'motion-reduce:transition-none',
      )}
      inputmode={props.inputMode}
      placeholder={props.placeholder}
      type={props.type ?? 'text'}
    />
    <Show when={props.description}>
      {(description) => (
        <TextField.Description class="text-xs leading-5 text-muted-foreground">
          {description()}
        </TextField.Description>
      )}
    </Show>
    <Show when={props.errorMessage}>
      {(message) => (
        <TextField.ErrorMessage class="text-xs leading-5 text-danger">
          {message()}
        </TextField.ErrorMessage>
      )}
    </Show>
  </TextField>
)
