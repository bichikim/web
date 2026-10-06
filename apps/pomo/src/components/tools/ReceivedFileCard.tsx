import {createMemo, createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {ReceivedFile} from 'src/features/file-transfer/received-files'
import {receivedFiles} from 'src/features/file-transfer/session'
import {PButton} from '../p-button/PButton'

const BYTES_PER_MEGABYTE = 1_000_000

export const formatFileSize = (size: number): string => {
  const kilobyte = 1_000
  const unit = size < kilobyte ? 'byte' : size < BYTES_PER_MEGABYTE ? 'kilobyte' : 'megabyte'
  const divisor = size < kilobyte ? 1 : size < BYTES_PER_MEGABYTE ? kilobyte : BYTES_PER_MEGABYTE
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: 'unit',
    unit,
  }).format(size / divisor)
}

const formats = [
  {
    icon: 'i-tabler-file-type-jpg',
    pattern: /^(?:image\/)|\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/iu,
  },
  {icon: 'i-tabler-file-music', pattern: /^(?:audio\/)|\.(?:mp3|wav|ogg|flac|m4a)$/iu},
  {icon: 'i-tabler-movie', pattern: /^(?:video\/)|\.(?:mp4|mov|webm|mkv)$/iu},
  {icon: 'i-tabler-file-type-pdf', pattern: /pdf|\.pdf$/iu},
  {icon: 'i-tabler-file-zip', pattern: /zip|compressed|\.(?:zip|7z|rar|tar|gz)$/iu},
  {icon: 'i-tabler-table', pattern: /spreadsheet|excel|\.(?:xlsx?|csv|ods)$/iu},
  {icon: 'i-tabler-presentation', pattern: /presentation|\.(?:pptx?|odp)$/iu},
  {icon: 'i-tabler-file-text', pattern: /^(?:text\/)|document|\.(?:txt|md|docx?|odt)$/iu},
]

export interface ReceivedFileCardProps {
  readonly file: ReceivedFile
}

export const ReceivedFileCard = (props: ReceivedFileCardProps) => {
  const [failedPreview, setFailedPreview] = createSignal(false)
  const icon = createMemo(
    () =>
      formats.find((format) => format.pattern.test(`${props.file.mimeType} ${props.file.name}`))
        ?.icon ?? 'i-tabler-file',
  )
  const image = () =>
    (props.file.url !== null && !failedPreview() && /^image\//iu.test(props.file.mimeType)) ||
    (props.file.url !== null &&
      !failedPreview() &&
      /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/iu.test(props.file.name))
  const kind = () =>
    props.file.name.includes('.')
      ? props.file.name.split('.').at(-1)?.toUpperCase()
      : props.file.mimeType || m.transfer_generic_file()
  const handleSave = () => receivedFiles.save(props.file.id)
  const handleRemove = () => receivedFiles.remove(props.file.id)
  const handlePreviewError = () => setFailedPreview(true)
  return (
    <article
      aria-label={props.file.name}
      tabIndex={-1}
      class={
        'grid min-w-0 gap-3 rounded-panel border border-border bg-background p-4 shadow-panel ' +
        'transition-transform duration-300 motion-reduce:transition-none ' +
        'outline-none focus-visible:outline-2 focus-visible:outline-highlight'
      }
      classList={{'grayscale text-muted-foreground': props.file.url === null}}
    >
      <div class="grid h-28 place-items-center overflow-hidden rounded-control bg-surface">
        <Show
          when={image()}
          fallback={<span aria-hidden="true" class={`${icon()} size-12 text-muted-foreground`} />}
        >
          <img
            alt={props.file.name}
            src={props.file.url ?? ''}
            onError={handlePreviewError}
            class="size-full object-contain"
            loading="lazy"
          />
        </Show>
      </div>
      <div class="grid min-w-0 gap-1">
        <h4 class="m-0 truncate text-sm font-bold" title={props.file.name}>
          {props.file.name}
        </h4>
        <p class="m-0 text-xs text-muted-foreground">
          {kind()} · {formatFileSize(props.file.size)}
        </p>
        <Show when={props.file.removed !== null}>
          <p class="m-0 text-xs text-muted-foreground">
            {props.file.removed === 'capacity'
              ? m.transfer_removed_capacity()
              : m.transfer_removed_manual()}
          </p>
        </Show>
        <Show when={props.file.saved && props.file.url !== null}>
          <p class="m-0 text-xs text-muted-foreground">{m.transfer_saved()}</p>
        </Show>
      </div>
      <div class="flex flex-wrap gap-2">
        <PButton
          size="small"
          icon="i-tabler-download"
          disabled={props.file.url === null}
          onPress={handleSave}
        >
          {m.transfer_save()}
        </PButton>
        <PButton
          size="small"
          tone="glass"
          transparent
          icon="i-tabler-trash"
          disabled={props.file.url === null || receivedFiles.state.saving}
          onPress={handleRemove}
        >
          {m.transfer_remove()}
        </PButton>
      </div>
    </article>
  )
}
