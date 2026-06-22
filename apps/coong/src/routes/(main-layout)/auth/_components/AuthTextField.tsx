import {TextField} from '@kobalte/core/text-field'
import {cx} from 'class-variance-authority'
import {type JSX} from 'solid-js'

const authTextFieldLabelClass = ':uno: block text-3.5 font-700 text-#2c3037'

const authTextFieldInputClass = cx(
  ':uno: h-11 w-full rounded-2 border border-black/12 bg-white px-3 text-4 outline-none',
  'transition-colors placeholder:text-#9aa1ad focus:border-#111216/45 focus:ring-3',
  'focus:ring-#111216/10 ui-disabled:bg-#f1f2f4 ui-disabled:text-#6f7682',
)

export interface AuthTextFieldProps {
  autocomplete?: string
  disabled?: boolean
  id: string
  label: JSX.Element
  minLength?: number
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  trailing?: JSX.Element
  type?: string
  value: string
}

export const AuthTextField = (props: AuthTextFieldProps): JSX.Element => {
  return (
    <TextField
      id={props.id}
      value={props.value}
      onChange={props.onChange}
      required={props.required}
      disabled={props.disabled}
      readOnly={props.readOnly}
    >
      <TextField.Label class={authTextFieldLabelClass}>{props.label}</TextField.Label>
      <div class=":uno: relative mt-1.5">
        <TextField.Input
          type={props.type}
          placeholder={props.placeholder}
          autocomplete={props.autocomplete}
          minLength={props.minLength}
          class={cx(authTextFieldInputClass, props.trailing && 'pr-10')}
        />
        {props.trailing}
      </div>
    </TextField>
  )
}
