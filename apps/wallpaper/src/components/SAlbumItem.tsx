import {Show} from 'solid-js'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import type {WallpaperController} from '../features/settings'
import {SMediaThumbnail} from './SMediaThumbnail'
import {useInputValue} from '../features/input'

interface SAlbumItemProps {
  readonly item: BackgroundMedia
  readonly controller: WallpaperController
  readonly selected: boolean
  readonly onPreview?: (id: string) => void
}

export const SAlbumItem = (props: SAlbumItemProps) => {
  const selection = useInputValue({value: () => props.selected})
  const handlePreview = () => props.onPreview?.(props.item.id)
  const handleToggle = () => {
    selection.reset()
    props.onPreview?.(props.item.id)
    return props.controller.toggleMedia(props.item.id)
  }
  return (
    <label class="shrink-0 cursor-pointer" title={props.item.name} onPointerEnter={handlePreview}>
      <input
        type="checkbox"
        class="peer sr-only"
        aria-label={props.item.name}
        checked={selection.value()}
        onChange={handleToggle}
        onFocus={handlePreview}
      />
      <span class="wallpaper-thumbnail">
        <SMediaThumbnail item={props.item} load={(id) => props.controller.loadMedia(id)} />
        <Show when={props.selected}>
          <span
            aria-hidden="true"
            class="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full
              bg-blue-700 text-[10px] text-white"
          >
            ✓
          </span>
        </Show>
        <Show when={props.item.kind === 'video'}>
          <span
            aria-hidden="true"
            class="absolute bottom-1 left-1 rounded bg-stone-900 px-1 text-[10px] text-white"
          >
            영상
          </span>
        </Show>
      </span>
    </label>
  )
}
