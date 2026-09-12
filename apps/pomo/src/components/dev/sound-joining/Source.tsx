import {createSignal, onCleanup, Show} from 'solid-js'
interface SourceProps {
  readonly label: string
  readonly disabled: boolean
  readonly onFile: (file: File | null) => void
}
export const Source = (props: SourceProps) => {
  const [url, setUrl] = createSignal<string | null>(null)
  onCleanup(() => {
    const value = url()
    if (value !== null) {
      URL.revokeObjectURL(value)
    }
  })
  const handleFileChange = (event: Event & {currentTarget: HTMLInputElement}) => {
    const file = event.currentTarget.files?.[0] ?? null
    const previous = url()
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
    setUrl(file === null ? null : URL.createObjectURL(file))
    props.onFile(file)
  }
  return (
    <section class="grid gap-3 rounded-xl border border-white/15 p-4">
      <label class="grid gap-3 text-sm font-700">
        {props.label}
        <input type="file" accept="audio/*" disabled={props.disabled} onChange={handleFileChange} />
      </label>
      <Show when={url()}>
        {(value) => (
          <audio controls src={value()} class="w-full" aria-label={`${props.label} 미리 듣기`} />
        )}
      </Show>
    </section>
  )
}
