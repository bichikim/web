import {createEffect, For, onCleanup, Show, untrack} from 'solid-js'
import * as m from '@paraglide/message'
import {type ArtStyle, useImageGeneration} from 'src/features/image-generation'
import type {PictureDiaryImage} from 'src/features/picture-diary'
import {PButton} from '../../PButton'
import {PModelDownloadStatus} from '../../PModelDownloadStatus'

export interface GenerationProps {
  readonly onPreviewChange?: (image: PictureDiaryImage | undefined) => void
  readonly onBusyChange?: (busy: boolean) => void
  readonly initialIdea?: string
  readonly onApply?: (image: PictureDiaryImage) => void
}

interface StyleOption {
  readonly value: ArtStyle
  readonly label: string
}

const getStyles = () =>
  [
    {label: m.picture_diary_style_abstract(), value: 'abstract'},
    {label: m.picture_diary_style_none(), value: 'none'},
    {label: m.picture_diary_style_watercolor(), value: 'watercolor'},
    {label: m.picture_diary_style_oil(), value: 'oil'},
    {label: m.picture_diary_style_pencil(), value: 'pencil'},
    {label: m.picture_diary_style_coloredPencil(), value: 'coloredPencil'},
    {label: m.picture_diary_style_pixel(), value: 'pixel'},
    {label: m.picture_diary_style_comic(), value: 'comic'},
    {label: m.picture_diary_style_photo(), value: 'photo'},
  ] satisfies ReadonlyArray<StyleOption>

export default function Generation(props: GenerationProps) {
  const studio = useImageGeneration()
  studio.setIdea(untrack(() => props.initialIdea ?? ''))
  studio.setStyle('coloredPencil')
  studio.selectRatio('16:9')
  createEffect(() => {
    const result = studio.result()
    const image = result === null ? undefined : {blob: result.blob, prompt: result.prompt}
    const busy = studio.busy()
    untrack(() => {
      props.onPreviewChange?.(image)
      props.onBusyChange?.(busy)
    })
  })
  onCleanup(() => {
    props.onPreviewChange?.(undefined)
    props.onBusyChange?.(false)
  })
  const handleApply = () => {
    const image = studio.result()
    if (image !== null && !studio.busy()) {
      props.onApply?.({blob: image.blob, prompt: image.prompt})
    }
  }
  return (
    <div class="grid gap-3">
      <label class="grid gap-2">
        <span>{m.picture_diary_scene()}</span>
        <textarea
          class="w-full box-border rounded-control border border-solid border-border bg-transparent p-3 text-foreground"
          maxlength={2000}
          rows={3}
          disabled={studio.busy()}
          value={studio.idea()}
          onInput={(event) => studio.setIdea(event.currentTarget.value)}
        />
      </label>
      <label class="grid gap-2">
        <span>{m.picture_diary_style()}</span>
        <select
          class={
            'w-full min-h-11 box-border rounded-control border border-solid border-border ' +
            'bg-surface px-3 text-foreground'
          }
          disabled={studio.busy()}
          value={studio.style()}
          onChange={(event) => {
            const selected = getStyles().find((item) => item.value === event.currentTarget.value)
            if (selected !== undefined) {
              studio.setStyle(selected.value)
            }
          }}
        >
          <For each={getStyles()}>{(item) => <option value={item.value}>{item.label}</option>}</For>
        </select>
      </label>
      <p class="m-0 text-sm text-muted-foreground">{m.picture_diary_generation_note()}</p>
      <div class="flex flex-wrap gap-2">
        <PButton
          size="small"
          disabled={studio.busy() || !studio.supported() || studio.idea().trim().length === 0}
          onPress={studio.generate}
        >
          {m.picture_diary_generate()}
        </PButton>
        <Show when={studio.result()}>
          <PButton size="small" disabled={studio.busy()} onPress={handleApply}>
            {m.picture_diary_draw_on_image()}
          </PButton>
        </Show>
        <Show when={studio.busy()}>
          <PButton size="small" tone="secondary" onPress={studio.stop}>
            {m.picture_diary_generation_stop()}
          </PButton>
        </Show>
      </div>
      <PModelDownloadStatus />
      <div role="status" aria-live="polite" class="text-sm">
        <p class="m-0">{studio.status()}</p>
        <Show when={studio.busy()}>
          <Show
            when={studio.percentage() !== undefined}
            fallback={
              <progress
                class="diary-generation-progress"
                aria-label={m.picture_diary_generation_progress()}
                max={100}
              />
            }
          >
            <progress
              class="diary-generation-progress"
              aria-label={m.picture_diary_generation_progress()}
              max={100}
              value={studio.percentage() ?? 0}
            />
          </Show>
        </Show>
      </div>
      <Show when={studio.error()}>
        {(error) => (
          <p class="m-0" role="alert">
            {error()}
          </p>
        )}
      </Show>
      <Show when={studio.result()}>
        {(image) => (
          <img class="block w-full rounded-control" src={image().url} alt={image().prompt} />
        )}
      </Show>
    </div>
  )
}
