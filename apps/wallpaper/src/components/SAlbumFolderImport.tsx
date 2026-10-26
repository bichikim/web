import {createSignal, Show} from 'solid-js'
import {selectFolderPhotos} from '../features/settings/select-folder-photos'
import {SDialog} from './SDialog'
import {SFileInput} from './SFileInput'
import {SNumberInput} from './SNumberInput'

interface SAlbumFolderImportProps {
  /** Prevents opening the picker during an existing import; defaults to enabled. */
  readonly disabled?: boolean
  /** Receives the selected photos once per selection; omission disables importing. */
  readonly onFiles?: (files: readonly File[]) => void | Promise<void>
}

export const SAlbumFolderImport = (props: SAlbumFolderImportProps) => {
  const [open, setOpen] = createSignal(false)
  const [allDepths, setAllDepths] = createSignal(true)
  const [depth, setDepth] = createSignal(1)
  const [error, setError] = createSignal<string | null>(null)
  const disabled = () => props.disabled || props.onFiles === undefined
  const handleOpen = (event: MouseEvent & {currentTarget: HTMLButtonElement}) => {
    if (!disabled()) {
      event.currentTarget.focus()
      setError(null)
      setOpen(true)
    }
  }
  const handleAll = (event: Event & {currentTarget: HTMLInputElement}) => {
    setAllDepths(event.currentTarget.checked)
    setError(null)
  }
  const handleDepth = (value: number) => {
    setDepth(Math.floor(value))
    setError(null)
  }
  const handleFiles = (files: readonly File[]) => {
    if (disabled()) {
      return
    }
    const photos = selectFolderPhotos(files, allDepths() ? null : depth())
    if (photos.length === 0) {
      setError('지정한 깊이에 가져올 사진이 없어요.')
      return
    }
    setOpen(false)
    return props.onFiles?.(photos)
  }
  return (
    <>
      <button
        type="button"
        aria-label="사진 폴더 추가"
        class="wallpaper-thumbnail shrink-0 cursor-pointer border-dashed text-stone-600
        [font-family:inherit] focus-visible:outline-solid focus-visible:outline-2
        focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50"
        disabled={disabled()}
        onClick={handleOpen}
      >
        <span class="grid justify-items-center gap-1 text-xs">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-5 w-5 fill-none stroke-current [stroke-width:1.6] [stroke-linejoin:round]"
          >
            <path d="M3 7V5h6l2 2h10v13H3Z" />
          </svg>
          폴더
        </span>
      </button>
      <Show when={open()}>
        <SDialog title="사진 폴더 추가" onClose={() => setOpen(false)}>
          <div class="grid min-h-0 gap-4 overflow-y-auto p-4">
            <label class="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                class="h-4 w-4 accent-stone-800"
                checked={allDepths()}
                onChange={handleAll}
              />
              하위 폴더 모두 포함
            </label>
            <Show when={!allDepths()}>
              <div class="grid gap-2">
                <div class="wallpaper-row">
                  <span>최대 깊이</span>
                  <SNumberInput
                    label="최대 깊이"
                    min={0}
                    step={1}
                    value={depth()}
                    onChange={handleDepth}
                  />
                </div>
                <p class="m-0 text-xs text-stone-600">선택한 폴더는 깊이 0입니다.</p>
              </div>
            </Show>
            <SFileInput
              label="폴더 선택"
              directory
              multiple
              disabled={disabled()}
              onFiles={handleFiles}
            />
            <Show when={error()}>
              {(message) => (
                <p role="alert" class="m-0 text-xs text-red-700">
                  {message()}
                </p>
              )}
            </Show>
          </div>
        </SDialog>
      </Show>
    </>
  )
}
