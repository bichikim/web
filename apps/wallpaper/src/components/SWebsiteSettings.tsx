import {For, Show} from 'solid-js'
import type {WallpaperController} from '../features/settings'
import type {WallpaperLibraryController} from '../features/library'
import {SInput} from './SInput'

interface SWebsiteSettingsProps {
  readonly controller: WallpaperController
  readonly library?: WallpaperLibraryController
}

export const SWebsiteSettings = (props: SWebsiteSettingsProps) => {
  const url = () => {
    const current = props.controller.current()?.content
    return current?.mode === 'website' ? (current.url ?? '') : ''
  }
  const visit = async (value: string) => {
    const monitorId = props.controller.selectedId()
    const address = value.trim()
    await props.controller.setContent({mode: 'website', url: address === '' ? null : address})
    if (address !== '' && monitorId !== null && props.controller.error() === null) {
      await props.library?.visit(monitorId, address)
    }
  }
  return (
    <div class="grid min-w-0 gap-3">
      <label class="wallpaper-label">
        웹사이트 주소
        <SInput
          label="웹사이트 주소"
          type="url"
          placeholder="https://"
          value={url()}
          onChange={visit}
        />
      </label>
      <Show when={(props.library?.history().length ?? 0) > 0}>
        <details>
          <summary class="wallpaper-disclosure">방문 내역</summary>
          <ul
            class="m-0 grid max-h-48 list-none gap-1 overflow-y-auto p-0"
            aria-label="웹사이트 방문 내역"
          >
            <For each={props.library?.history()}>
              {(entry) => (
                <li class="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    title={entry.url}
                    class="min-h-8 min-w-0 flex-1 cursor-pointer truncate rounded border-0 bg-transparent px-2
            text-left text-[13px] text-stone-800 hover:bg-stone-200"
                    onClick={() => visit(entry.url)}
                  >
                    {entry.url}
                  </button>
                  <button
                    type="button"
                    aria-label={`${entry.url} 내역 삭제`}
                    class="min-h-8 shrink-0 cursor-pointer rounded border-0 bg-transparent px-2
            text-xs text-stone-600 hover:bg-stone-200"
                    onClick={() => props.library?.removeVisit(entry.url)}
                  >
                    삭제
                  </button>
                </li>
              )}
            </For>
          </ul>
        </details>
      </Show>
    </div>
  )
}
