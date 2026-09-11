import {PInput} from './PInput'
import {PTextarea} from './PTextarea'
import {FIELD_DESCRIPTION} from 'src/components/field-classes'
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
  readonly multiline?: boolean
  readonly rows?: number
  readonly label: string
  readonly name?: string
  readonly onChange?: (value: string) => void
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
    <TextField.Label class="w-fit text-base font-650 text-foreground">
      {props.label}
    </TextField.Label>
    <Show
      when={props.multiline}
      fallback={
        <TextField.Input
          as={PInput}
          autocomplete={props.autoComplete}
          inputmode={props.inputMode}
          placeholder={props.placeholder}
          type={props.type ?? 'text'}
        />
      }
    >
      <TextField.TextArea
        as={PTextarea}
        autocomplete={props.autoComplete}
        inputmode={props.inputMode}
        placeholder={props.placeholder}
        rows={props.rows}
      />
    </Show>
    <Show when={props.description}>
      {(description) => (
        <TextField.Description class={FIELD_DESCRIPTION}>{description()}</TextField.Description>
      )}
    </Show>
    <Show when={props.errorMessage}>
      {(message) => (
        <TextField.ErrorMessage class="text-sm leading-5 text-danger">
          {message()}
        </TextField.ErrorMessage>
      )}
    </Show>
  </TextField>
)
