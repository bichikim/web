import {createEffect, For, Show} from 'solid-js'
import {SIcon} from './SIcon'
import {useTableView} from './use-table-view'

interface STableDocumentProps {
  source: string
  delimiter: ',' | '\t'
  onError?: (error: unknown) => void
}
const sortButtonClasses = [
  'ui-focus flex w-full items-center justify-between gap-3 bg-transparent',
  'px-3 py-2 text-left hover:bg-hover',
].join(' ')
export const STableDocument = (props: STableDocumentProps) => {
  const table = useTableView({delimiter: () => props.delimiter, source: () => props.source})
  createEffect(() => {
    const parsed = table.data()
    if (!parsed.ok) {
      props.onError?.(new Error(parsed.message))
    }
  })
  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-divider px-4 py-2">
        <input
          aria-label="행 필터링"
          class="ui-input w-48 py-1"
          placeholder="행 필터링…"
          value={table.query()}
          onInput={(event) => table.changeQuery(event.currentTarget.value)}
        />
        <label class="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={table.header()}
            onChange={(event) => table.changeHeader(event.currentTarget.checked)}
          />
          첫 행을 열 이름으로
        </label>
        <span class="text-sm text-muted">{table.count()}행</span>
        <Show when={table.truncated()}>
          <span class="text-xs text-muted">
            표는 처음 10,000행·100열까지 표시합니다. 전체 내용은 원문에서 확인하세요.
          </span>
        </Show>
      </div>
      <Show
        when={table.data().ok}
        fallback={
          <p role="status" class="m-0 p-4 text-sm text-muted">
            표를 표시할 수 없습니다. 원문을 확인해 주세요.
          </p>
        }
      >
        <div class="min-h-0 min-w-0 flex-1 overflow-auto">
          <table aria-label="파일 데이터" class="min-w-full border-collapse text-sm">
            <thead class="bg-surface">
              <tr>
                <For each={table.headers()}>
                  {(name, index) => (
                    <th
                      scope="col"
                      aria-sort={
                        table.sort()?.column === index()
                          ? table.sort()?.descending
                            ? 'descending'
                            : 'ascending'
                          : 'none'
                      }
                      class="border-b border-r border-divider p-0 text-left font-medium"
                    >
                      <button
                        aria-label={`${name} 정렬`}
                        class={sortButtonClasses}
                        type="button"
                        onClick={() => table.order(index())}
                      >
                        <span class="max-w-80 whitespace-pre-wrap break-words">{name}</span>
                        <span aria-hidden="true" class="text-muted">
                          {table.sort()?.column === index()
                            ? table.sort()?.descending
                              ? '↓'
                              : '↑'
                            : '↕'}
                        </span>
                      </button>
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={table.visible()}>
                {(row) => (
                  <tr class="hover:bg-hover">
                    <For each={table.headers()}>
                      {(_name, index) => (
                        <td class="border-b border-r border-divider px-3 py-2 align-top">
                          <span class="block min-w-16 max-w-80 whitespace-pre-wrap break-words">
                            {row[index()] ?? ''}
                          </span>
                        </td>
                      )}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <Show when={table.count() === 0}>
            <p role="status" class="m-0 p-4 text-sm text-muted">
              표시할 행이 없습니다.
            </p>
          </Show>
        </div>
        <div
          aria-label="표 페이지 조절"
          class="flex shrink-0 items-center justify-end gap-2 border-t border-divider px-4 py-1"
        >
          <button
            aria-label="이전 표 페이지"
            class="ui-icon-button"
            type="button"
            disabled={table.page() <= 1}
            onClick={() => table.move(-1)}
          >
            <SIcon name="back" />
          </button>
          <span class="text-sm text-muted">
            {table.page()} / {table.pages()}
          </span>
          <button
            aria-label="다음 표 페이지"
            class="ui-icon-button"
            type="button"
            disabled={table.page() >= table.pages()}
            onClick={() => table.move(1)}
          >
            <SIcon name="forward" />
          </button>
        </div>
      </Show>
    </div>
  )
}
