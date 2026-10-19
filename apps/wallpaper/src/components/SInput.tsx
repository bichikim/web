import {createEffect, createMemo, createSignal} from 'solid-js'

interface SInputProps {
  readonly label?: string
  readonly value?: string
  readonly type?: 'text' | 'url'
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly onChange?: (value: string) => void | Promise<void>
}

export const SInput = (props: SInputProps) => {
  const [local, setLocal] = createSignal('')
  const [draft, setDraft] = createSignal<string | null>(null)
  const value = createMemo(() => props.value ?? local())
  createEffect(() => {
    value()
    setDraft(null)
  })
  const commit = () => {
    const pending = draft()
    setDraft(null)
    if (!props.disabled && pending !== null && pending !== value()) {
      setLocal(pending)
      return props.onChange?.(pending)
    }
  }
  const handleKeyboard = (event: KeyboardEvent) => {
    if (event.isComposing || props.disabled) {
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      setDraft(null)
    }
  }
  return (
    <input
      class="wallpaper-field appearance-none [font-family:inherit]"
      type={props.type ?? 'text'}
      aria-label={props.label}
      placeholder={props.placeholder}
      value={draft() ?? value()}
      readOnly={props.disabled}
      aria-disabled={props.disabled ?? false}
      onInput={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={handleKeyboard}
    />
  )
}
