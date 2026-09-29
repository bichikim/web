import {For, type JSX, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {
  CUSTOM_ALBUM_ICON_CLASSES,
  CUSTOM_ALBUM_ICONS,
  type CustomAlbumIcon,
} from '../../features/custom-albums'
import {CustomAlbumCoverImage} from './CustomAlbumCoverImage'

interface CustomAlbumCoverFieldProps {
  readonly coverIcon: CustomAlbumIcon
  readonly coverImage: Blob | null
  readonly disabled: boolean
  readonly onImageSelected: JSX.EventHandler<HTMLInputElement, Event>
  readonly onSelectIcon: (icon: CustomAlbumIcon) => void
}

const getCustomAlbumIconLabel = (icon: CustomAlbumIcon): string => {
  switch (icon) {
    case 'disc':
      return m.album_custom_icon_disc()
    case 'sunrise':
      return m.album_custom_icon_sunrise()
    case 'moon':
      return m.album_custom_icon_moon()
    case 'headphones':
      return m.album_custom_icon_headphones()
    case 'waves':
      return m.album_custom_icon_waves()
    case 'leaf':
      return m.album_custom_icon_leaf()
  }

  icon satisfies never
  return m.album_custom_icon_disc()
}

export const CustomAlbumCoverField = (props: CustomAlbumCoverFieldProps) => (
  <fieldset class="m-0 grid gap-2 border-0 p-0">
    <legend class="text-base font-650 text-foreground">{m.album_custom_cover_label()}</legend>
    <div class="flex flex-wrap items-start gap-3">
      <Show
        fallback={
          <div
            aria-hidden="true"
            class="grid size-24 flex-none place-items-center rounded-4 bg-content-surface text-highlight"
          >
            <span class={`${CUSTOM_ALBUM_ICON_CLASSES[props.coverIcon]} size-10`} />
          </div>
        }
        when={props.coverImage}
      >
        {(coverImage) => (
          <CustomAlbumCoverImage
            alt={m.album_custom_cover_preview()}
            class="size-24 flex-none rounded-4 object-cover"
            coverImage={coverImage()}
          />
        )}
      </Show>
      <div class="grid min-w-0 grow gap-3">
        <div aria-label={m.album_custom_cover_label()} class="flex flex-wrap gap-2" role="group">
          <For each={CUSTOM_ALBUM_ICONS}>
            {(icon) => {
              const isSelected = () => props.coverImage === null && props.coverIcon === icon
              const iconLabel = getCustomAlbumIconLabel(icon)

              return (
                <button
                  aria-label={iconLabel}
                  aria-pressed={isSelected()}
                  class={
                    `grid size-11 place-items-center rounded-control border border-solid ${
                      isSelected()
                        ? 'border-highlight bg-primary-soft text-highlight'
                        : 'border-border bg-content-surface text-muted-foreground'
                    } cursor-pointer outline-none transition-colors ` +
                    `hover:border-highlight hover:text-foreground ` +
                    `focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50`
                  }
                  disabled={props.disabled}
                  onClick={() => props.onSelectIcon(icon)}
                  title={iconLabel}
                  type="button"
                >
                  <span aria-hidden="true" class={`${CUSTOM_ALBUM_ICON_CLASSES[icon]} size-5`} />
                </button>
              )
            }}
          </For>
        </div>
        <label
          class={
            `inline-flex w-fit cursor-pointer items-center gap-2 rounded-control ` +
            `border border-solid px-3 py-2 text-sm font-650 text-foreground ` +
            `hover:border-highlight focus-within:shadow-focus ${
              props.coverImage === null
                ? 'border-border bg-content-surface'
                : 'border-highlight bg-primary-soft'
            }`
          }
          for="custom-album-cover-image"
        >
          <span aria-hidden="true" class="i-tabler-photo-plus size-4" />
          <span>
            {props.coverImage === null
              ? m.album_custom_cover_add_image()
              : m.album_custom_cover_change_image()}
          </span>
          <input
            accept="image/*"
            class="sr-only"
            disabled={props.disabled}
            id="custom-album-cover-image"
            onChange={(event) => props.onImageSelected(event)}
            type="file"
          />
        </label>
      </div>
    </div>
    <p class="m-0 text-xs leading-5 text-muted-foreground">{m.album_custom_cover_help()}</p>
  </fieldset>
)
