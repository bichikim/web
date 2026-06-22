import {Button} from '@kobalte/core/button'
import {cx} from 'class-variance-authority'
import {type JSX} from 'solid-js'

const authSubmitButtonClass = cx(
  ':uno: inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-2 border-0',
  'bg-#111216 px-4 text-4 font-800 text-white shadow-[0_12px_28px_rgba(17,18,22,0.18)]',
  'outline-none transition-colors hover:bg-#2a2c31 focus-visible:ring-3 focus-visible:ring-#111216/16',
  'ui-disabled:cursor-not-allowed ui-disabled:opacity-50',
)

export interface AuthSubmitButtonProps {
  children: JSX.Element
  disabled?: boolean
}

export const AuthSubmitButton = (props: AuthSubmitButtonProps): JSX.Element => {
  return (
    <Button type="submit" disabled={props.disabled} class={authSubmitButtonClass}>
      {props.children}
    </Button>
  )
}
