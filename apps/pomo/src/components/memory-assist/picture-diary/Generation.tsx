import {PTextarea} from 'src/components/PTextarea'
import {noneEmptyString} from 'src/utils/none-empty-string'
import {createEffect, onCleanup, Show, untrack} from 'solid-js'
import * as m from '@paraglide/message'
import {type ArtStyle, useImageGeneration} from 'src/features/image-generation'
import type {PictureDiaryImage} from 'src/features/picture-diary'
import {PSelect} from '../../PSelect'
import {PButton} from '../../PButton'

const PROGRESS_CLASSES =
  'block appearance-none w-full h-1.5 mt-2.5 mb-1 overflow-hidden border-0 rounded ' +
  '[--progress-track:rgb(var(--pomo-color-highlight-channels)/14%)] ' +
  'bg-[var(--progress-track)] text-highlight ' +
  '[&::-webkit-progress-bar]:rounded-inherit [&::-webkit-progress-bar]:bg-[var(--progress-track)] ' +
  '[&::-webkit-progress-value]:rounded-inherit [&::-webkit-progress-value]:bg-highlight ' +
  '[&::-webkit-progress-value]:[transition:width_240ms_ease-out] ' +
  '[&::-moz-progress-bar]:rounded-inherit [&::-moz-progress-bar]:bg-highlight ' +
  '[--progress-fill:linear-gradient(90deg,transparent,currentColor,transparent)] ' +
  '[&:indeterminate]:[background:var(--progress-fill)_-50%_0/40%_100%_no-repeat,var(--progress-track)] ' +
  '[&:indeterminate]:animate-diary-progress-pending ' +
  '[&:indeterminate::-webkit-progress-bar]:bg-transparent [&:indeterminate::-moz-progress-bar]:bg-transparent ' +
  'motion-reduce:[&:indeterminate]:animate-none motion-reduce:[&:indeterminate]:[background-position:50%_0] ' +
  'motion-reduce:[&::-webkit-progress-value]:transition-none'

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

export function Generation(props: GenerationProps) {
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
        <PTextarea
          unstyled
          class="w-full box-border rounded-control border border-solid border-border bg-transparent p-3 text-foreground"
          maxlength={2000}
          rows={3}
          disabled={studio.busy()}
          value={studio.idea()}
          onInput={(event) => studio.setIdea(event.currentTarget.value)}
        />
      </label>
      <PSelect
        label={m.picture_diary_style()}
        disabled={studio.busy()}
        options={getStyles()}
        value={studio.style()}
        onChange={studio.setStyle}
      />
      <p class="m-0 text-sm text-muted-foreground">{m.picture_diary_generation_note()}</p>
      <div class="flex flex-wrap gap-2">
        <PButton
          raised
          size="small"
          disabled={studio.busy() || !studio.supported() || !noneEmptyString(studio.idea())}
          onPress={studio.generate}
        >
          {m.picture_diary_generate()}
        </PButton>
        <Show when={studio.result()}>
          <PButton raised size="small" disabled={studio.busy()} onPress={handleApply}>
            {m.picture_diary_draw_on_image()}
          </PButton>
        </Show>
        <Show when={studio.busy()}>
          <PButton bordered transparent size="small" tone="secondary" onPress={studio.stop}>
            {m.picture_diary_generation_stop()}
          </PButton>
        </Show>
      </div>
      <div
        role="status"
        aria-live="polite"
        class="rounded-xl bg-primary-soft p-3 text-sm text-foreground leading-relaxed"
      >
        <div class="flex items-center gap-2.5">
          <span aria-hidden="true" class="i-tabler-palette size-5 flex-none text-highlight" />
          <p class="m-0 min-w-0 flex-1">{studio.status()}</p>
          <Show when={studio.busy() && studio.percentage() !== undefined}>
            <strong class="text-highlight">{studio.percentage()}%</strong>
          </Show>
        </div>
        <Show when={studio.busy()}>
          <Show
            when={studio.percentage() !== undefined}
            fallback={
              <progress
                class={PROGRESS_CLASSES}
                aria-label={m.picture_diary_generation_progress()}
                max={100}
              />
            }
          >
            <progress
              class={PROGRESS_CLASSES}
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
