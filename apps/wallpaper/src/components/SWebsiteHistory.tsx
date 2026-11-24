import {text as uiText} from '../features/localization'
import {For, Show} from 'solid-js'
import type {WebsiteVisit} from '@winter-love/wallpaper/settings/library-model'

interface SWebsiteHistoryProps {
  readonly history?: readonly WebsiteVisit[]
  readonly onChoose?: (url: string) => void | Promise<void>
  readonly onRemove?: (url: string) => void | Promise<void>
}

export const SWebsiteHistory = (props: SWebsiteHistoryProps) => (
  <ul class="m-0 grid list-none gap-1 p-0" aria-label={uiText('웹사이트 방문 내역')}>
    <For each={props.history}>
      {(entry) => (
        <li class="flex min-w-0 items-center gap-1">
          <button
            type="button"
            title={entry.url}
            disabled={props.onChoose === undefined}
            class="wallpaper-option min-w-0 flex-1 appearance-none border-0 bg-transparent text-left
            text-[13px] text-stone-800 [font-family:inherit] focus-visible:outline-solid
            focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
            onClick={() => props.onChoose?.(entry.url)}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span class="truncate">{entry.url}</span>
          </button>
          <Show when={props.onRemove !== undefined}>
            <button
              type="button"
              aria-label={uiText('{value0} 내역 삭제', {value0: String(entry.url)})}
              class="min-h-8 shrink-0 cursor-pointer appearance-none rounded border-0 bg-transparent px-2
              text-xs text-stone-600 [font-family:inherit] hover:bg-stone-100 focus-visible:outline-solid
              focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
              onClick={() => props.onRemove?.(entry.url)}
              onMouseDown={(event) => event.preventDefault()}
            >
              {uiText('삭제')}
            </button>
          </Show>
        </li>
      )}
    </For>
  </ul>
)
