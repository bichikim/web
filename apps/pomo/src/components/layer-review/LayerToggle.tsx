import {type JSX} from 'solid-js'

interface LayerToggleProps {
  readonly checked: boolean
  readonly description: string
  readonly label: string
  readonly onChange: (checked: boolean) => void
}

export const LayerToggle = (props: LayerToggleProps) => {
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    props.onChange(event.currentTarget.checked)
  }

  return (
    <label class="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span class="block text-sm font-700 text-#fffaf1">{props.label}</span>
        <span class="mt-1 block text-xs leading-5 text-#a99fac">{props.description}</span>
      </span>
      <input
        checked={props.checked}
        class="size-5 shrink-0 accent-#e8c795"
        onChange={handleChange}
        type="checkbox"
      />
    </label>
  )
}
