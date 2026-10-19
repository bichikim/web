import {createSignal, Show} from 'solid-js'

interface SFileInputProps {
  readonly label?: string
  readonly accept?: string
  readonly multiple?: boolean
  readonly disabled?: boolean
  readonly onFiles?: (files: readonly File[]) => void | Promise<void>
}

export const SFileInput = (props: SFileInputProps) => {
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [name, setName] = createSignal<string | null>(null)
  const handleOpen = () => {
    if (!props.disabled) {
      input()?.click()
    }
  }
  const handleFiles = (event: Event & {currentTarget: HTMLInputElement}) => {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (!props.disabled && files.length > 0) {
      setName(files.length === 1 ? files[0]!.name : `파일 ${files.length}개`)
      trigger()?.focus()
      return props.onFiles?.(files)
    }
  }
  return (
    <span class="flex min-w-0 items-center gap-3">
      <button
        ref={setTrigger}
        type="button"
        class="wallpaper-file-button"
        aria-disabled={props.disabled ?? false}
        onClick={handleOpen}
      >
        {props.label ?? '파일 가져오기'}
      </button>
      <Show when={name()}>
        {(name) => (
          <span class="truncate text-xs text-stone-600" title={name()}>
            {name()}
          </span>
        )}
      </Show>
      <input
        ref={setInput}
        type="file"
        class="hidden"
        tabindex="-1"
        aria-hidden="true"
        accept={props.accept}
        multiple={props.multiple}
        disabled={props.disabled}
        onChange={handleFiles}
      />
    </span>
  )
}
