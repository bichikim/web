interface SSwitchProps {
  readonly label?: string
  readonly checked?: boolean
  readonly disabled?: boolean
  readonly onChange?: (checked: boolean) => void | Promise<void>
}

export const SSwitch = (props: SSwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-label={props.label}
    aria-checked={props.checked ?? false}
    disabled={props.disabled || props.onChange === undefined}
    onClick={() => props.onChange?.(!props.checked)}
    class="relative box-border h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 p-0
    disabled:cursor-default disabled:opacity-40 focus-visible:outline-solid focus-visible:outline-2
    focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    classList={{'bg-blue-700': props.checked, 'bg-stone-500': !props.checked}}
  >
    <span
      aria-hidden="true"
      class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
      classList={{'translate-x-5': props.checked}}
    />
  </button>
)
