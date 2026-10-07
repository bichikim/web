import * as m from '@paraglide/message'
import type {JSX} from 'solid-js'
import {UprightViewToggle} from './UprightViewToggle'

export interface OptionsProps {
  readonly autoRead?: boolean
  readonly onAutoReadChange?: (checked: boolean) => void
  readonly onUprightChange?: (checked: boolean) => void
  readonly upright?: boolean
}

export const Options = (props: OptionsProps) => {
  const handleAutoRead: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onAutoReadChange?.(event.currentTarget.checked)
  }
  return (
    <fieldset
      aria-label={m.tarot_options()}
      class="m-0 min-w-0 flex flex-wrap items-center gap-x-6 gap-y-3 border-0 p-0"
    >
      <UprightViewToggle
        checked={props.upright ?? true}
        disabled={props.onUprightChange === undefined}
        onChange={(checked) => props.onUprightChange?.(checked)}
      />
      <label class="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-[#d8b97e] sm:text-sm">
        <input
          type="checkbox"
          class="m-0 size-4 shrink-0 cursor-pointer accent-[#d8b97e]"
          checked={props.autoRead ?? false}
          disabled={props.onAutoReadChange === undefined}
          onChange={handleAutoRead}
        />
        <span>{m.tarot_voice_auto_read()}</span>
      </label>
    </fieldset>
  )
}
