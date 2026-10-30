import type {WallpaperController} from '../features/settings'
import {retainInputFocus} from '../features/input'
import {SAlbumFolderImport} from './SAlbumFolderImport'

interface SAlbumImportProps {
  readonly controller: WallpaperController
}

export const SAlbumImport = (props: SAlbumImportProps) => {
  const handleFiles = (event: Event & {currentTarget: HTMLInputElement}) => {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    return retainInputFocus({
      element: event.currentTarget,
      operation: () => props.controller.addMedia(files),
    })
  }
  return (
    <>
      <label class="shrink-0 cursor-pointer" title="사진·동영상 추가">
        <input
          type="file"
          class="peer sr-only"
          aria-label="사진·동영상 추가"
          accept="image/*,video/*"
          multiple
          onChange={handleFiles}
          disabled={props.controller.busy()}
        />
        <span class="wallpaper-thumbnail border-dashed text-2xl text-stone-600">＋</span>
      </label>
      <SAlbumFolderImport disabled={props.controller.busy()} onFiles={props.controller.addMedia} />
    </>
  )
}
