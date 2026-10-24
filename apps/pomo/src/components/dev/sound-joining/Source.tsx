import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
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
      replaceBlobObjectUrl(value, () => null)
    }
  })
  const handleFileChange = (event: Event & {currentTarget: HTMLInputElement}) => {
    const file = event.currentTarget.files?.[0] ?? null
    setUrl(replaceBlobObjectUrl(url(), () => file))
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
