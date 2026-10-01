import * as m from '@paraglide/message'
import type {JSX} from 'solid-js'

export interface UprightViewToggleProps {
  readonly checked: boolean
  readonly disabled?: boolean
  readonly onChange: (checked: boolean) => void
}

export const UprightViewToggle = (props: UprightViewToggleProps) => {
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange(event.currentTarget.checked)
  }

  return (
    <label class="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-[#d8b97e] sm:text-sm">
      <input
        type="checkbox"
        class="m-0 size-4 shrink-0 cursor-pointer accent-[#d8b97e]"
        checked={props.checked}
        disabled={props.disabled}
        onChange={handleChange}
      />
      <span>{m.tarot_show_upright()}</span>
    </label>
  )
}
