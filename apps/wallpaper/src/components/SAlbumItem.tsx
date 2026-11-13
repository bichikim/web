import {Show} from 'solid-js'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import type {WallpaperController} from '../features/settings'
import {isBuiltinMedia} from '../features/builtin-assets'
import {SMediaThumbnail} from './SMediaThumbnail'
import {useInputValue} from '../features/input'

interface SAlbumItemProps {
  readonly item: BackgroundMedia
  readonly controller: WallpaperController
  readonly selected: boolean
  /** Requests removal separately from album selection; omitted to hide the action. */
  readonly onRemove?: () => void
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
    <div class="relative shrink-0">
      <label class="block cursor-pointer" title={props.item.name} onPointerEnter={handlePreview}>
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
      <Show when={props.onRemove}>
        <button
          type="button"
          aria-label={`${props.item.name} ${isBuiltinMedia(props.item.id) ? '숨기기' : '삭제'}`}
          title={isBuiltinMedia(props.item.id) ? '숨기기' : '삭제'}
          onClick={() => props.onRemove?.()}
          disabled={props.controller.busy()}
          class="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full border-0
          bg-stone-900/80 p-0 text-white hover:bg-red-700 disabled:opacity-40
          focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-4 w-4 fill-none stroke-current stroke-2"
          >
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" />
          </svg>
        </button>
      </Show>
    </div>
  )
}
