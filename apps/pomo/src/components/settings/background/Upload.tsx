import {createSignal, createUniqueId, onCleanup, onMount} from 'solid-js'
import * as m from '@paraglide/message'

export interface UploadProps {
  readonly disabled?: boolean
  readonly onFiles: (files: readonly File[]) => void
}

const isFileDrag = (event: DragEvent) => event.dataTransfer?.types.includes('Files') === true

export const Upload = (props: UploadProps) => {
  const [dragging, setDragging] = createSignal(false)
  const inputId = createUniqueId()
  const hintId = createUniqueId()
  onMount(() => {
    const preventNavigation = (event: DragEvent) => {
      if (isFileDrag(event)) {
        event.preventDefault()
        if (event.type === 'dragover' && event.dataTransfer !== null) {
          event.dataTransfer.dropEffect = 'none'
        }
      }
    }
    window.addEventListener('dragover', preventNavigation)
    window.addEventListener('drop', preventNavigation)
    onCleanup(() => {
      window.removeEventListener('dragover', preventNavigation)
      window.removeEventListener('drop', preventNavigation)
    })
  })
  return (
    <div
      role="group"
      aria-label={m.background_add()}
      data-dragging={dragging() && !props.disabled}
      class={
        'grid gap-2 rounded-control border border-dashed border-border bg-surface-overlay p-4 ' +
        'data-[dragging=true]:border-primary data-[dragging=true]:bg-primary-soft'
      }
      onDragOver={(event) => {
        if (!isFileDrag(event)) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer !== null) {
          event.dataTransfer.dropEffect = props.disabled ? 'none' : 'copy'
        }
        setDragging(!props.disabled)
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setDragging(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setDragging(false)
        if (!props.disabled) {
          const files = Array.from(event.dataTransfer?.files ?? [])
          if (files.length > 0) {
            props.onFiles(files)
          }
        }
      }}
    >
      <label for={inputId} class="text-sm font-650">
        {m.background_add()}
      </label>
      <p class="m-0 text-sm text-muted-foreground" id={hintId}>
        {dragging() && !props.disabled ? m.background_drop_release() : m.background_drop_hint()}
      </p>
      <input
        id={inputId}
        aria-describedby={hintId}
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={props.disabled}
        class={
          'min-w-0 w-full text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-control ' +
          'file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-foreground focus-visible:shadow-focus'
        }
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
          if (!props.disabled && files.length > 0) {
            props.onFiles(files)
          }
        }}
      />
    </div>
  )
}
