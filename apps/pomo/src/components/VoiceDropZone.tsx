import {cx} from 'class-variance-authority'
import {createSignal, type JSX, Show} from 'solid-js'

const BYTES_PER_KILOBYTE = 1000
const formatFileSize = (size: number) => `${Math.ceil(size / BYTES_PER_KILOBYTE)}KB`

export interface ImportedVoice {
  readonly name: string
  readonly size: number
}

interface VoiceDropZoneProps {
  readonly disabled: boolean
  readonly fileError: string | null
  readonly importedVoice: ImportedVoice | null
  readonly onFileSelect: (file: File | undefined) => Promise<void>
}

export const VoiceDropZone = (props: VoiceDropZoneProps) => {
  const [isDragging, setIsDragging] = createSignal(false)
  let dragDepth = 0

  const handleFileChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    props.onFileSelect(file)
  }
  const handleDragEnter: JSX.EventHandler<HTMLLabelElement, DragEvent> = (event) => {
    event.preventDefault()

    if (!props.disabled) {
      dragDepth += 1
      setIsDragging(true)
    }
  }
  const handleDragOver: JSX.EventHandler<HTMLLabelElement, DragEvent> = (event) => {
    event.preventDefault()
    const {dataTransfer} = event

    if (dataTransfer !== null) {
      dataTransfer.dropEffect = props.disabled ? 'none' : 'copy'
    }
  }
  const handleDragLeave: JSX.EventHandler<HTMLLabelElement, DragEvent> = (event) => {
    event.preventDefault()
    dragDepth = Math.max(0, dragDepth - 1)

    if (dragDepth === 0) {
      setIsDragging(false)
    }
  }
  const handleDrop: JSX.EventHandler<HTMLLabelElement, DragEvent> = (event) => {
    event.preventDefault()
    const file = event.dataTransfer?.files[0]
    dragDepth = 0
    setIsDragging(false)

    if (!props.disabled && file !== undefined) {
      props.onFileSelect(file)
    }
  }

  return (
    <div class="grid gap-2.5">
      <span class="text-sm font-650 text-#eee5ef">커스텀 목소리 JSON</span>
      <label
        class={cx(
          'grid min-h-24 place-items-center rounded-4 border border-dashed p-4 text-center transition',
          isDragging()
            ? 'border-#f2a7b8 bg-#f2a7b8/12'
            : 'border-white/14 bg-white/3 hover:border-#f2a7b8/55',
          props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          accept="application/json,.json"
          class="sr-only"
          disabled={props.disabled}
          onChange={handleFileChange}
          type="file"
        />
        <span>
          <span class="block text-sm font-700 text-#eee5ef">
            {isDragging() ? '여기에 놓아 가져오기' : 'JSON 파일을 놓거나 클릭해 선택'}
          </span>
          <span class="mt-1 block text-xs leading-5 text-#8f8297">
            최대 2MB · 파일과 대사는 서버로 전송하지 않음
          </span>
        </span>
      </label>
      <Show when={props.importedVoice}>
        {(voice) => (
          <p class="m-0 rounded-4 border border-#9ed6bb/20 bg-#9ed6bb/6 px-4 py-3 text-sm text-#b8e8d0">
            <span class="font-700">{voice().name}</span> · {formatFileSize(voice().size)} 선택됨
          </p>
        )}
      </Show>
      <Show when={props.fileError}>
        {(message) => (
          <p aria-live="polite" class="m-0 text-sm leading-6 text-#ff9aa8" role="alert">
            {message()}
          </p>
        )}
      </Show>
    </div>
  )
}
