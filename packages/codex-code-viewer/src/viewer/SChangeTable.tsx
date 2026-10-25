import {createEffect, createMemo, createSignal, For, on, onCleanup, Show} from 'solid-js'
import type {ChangeRow} from './types'
import type {TextMatch} from './find-text'
import {highlightCodeLines} from './highlight-code-lines'
import {STokenText} from './STokenText'
import {useTranslations} from './locale/use-translations'
import {useChangeViewport} from './use-change-viewport'

interface SChangeTableProps {
  readonly rows: readonly ChangeRow[]
  readonly path: string
  readonly matches?: readonly TextMatch[]
  readonly activeMatch?: number
  readonly searchScrollRequest?: number
}

export const SChangeTable = (props: SChangeTableProps) => {
  const t = useTranslations()
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const viewport = useChangeViewport({
    element,
    match: () => props.matches?.[props.activeMatch ?? -1],
    request: () => props.searchScrollRequest ?? 0,
    rows: () => props.rows,
  })
  const tokens = createMemo(() => highlightCodeLines(props.path, viewport.source()))
  createEffect(
    on(
      [element, () => props.searchScrollRequest, () => props.activeMatch, () => props.matches],
      () => {
        const active = props.activeMatch ?? -1
        const container = element()
        if ((props.searchScrollRequest ?? 0) > 0 && active >= 0) {
          viewport.locate()
          let disposed = false
          onCleanup(() => {
            disposed = true
          })
          queueMicrotask(() => {
            if (!disposed) {
              container
                ?.querySelector(`[data-search-match="${active}"]`)
                ?.scrollIntoView?.({block: 'center', inline: 'nearest'})
            }
          })
        }
      },
    ),
  )
  return (
    <div
      role="table"
      aria-label={t('변경 내용 비교')}
      aria-rowcount={props.rows.length}
      class="max-h-[min(480px,60dvh)] overflow-auto [overflow-anchor:none]"
      style={{'--change-width': `${viewport.width()}px`}}
      onScroll={viewport.scroll}
      ref={setElement}
    >
      <div class="w-max min-w-[max(100%,var(--change-width))] py-1 font-mono text-xs leading-6">
        <For each={viewport.indices()}>
          {(index) => (
            <>
              <Show when={viewport.gap(index) > 0}>
                <div
                  aria-hidden="true"
                  class="h-[var(--change-gap)]"
                  style={{'--change-gap': `${viewport.gap(index)}px`}}
                />
              </Show>
              <Show when={props.rows[index]} keyed>
                {(row) => (
                  <div
                    role="row"
                    aria-rowindex={index + 1}
                    class="flex min-h-6 pr-4"
                    classList={{
                      'bg-change-added-background': row.kind === 'added',
                      'bg-change-deleted-background': row.kind === 'deleted',
                    }}
                  >
                    <span
                      role="cell"
                      aria-label={t('이전 줄 번호')}
                      class="w-10 shrink-0 select-none pr-2 text-right text-muted"
                    >
                      {row.previous}
                    </span>
                    <span
                      role="cell"
                      aria-label={t('현재 줄 번호')}
                      class="w-10 shrink-0 select-none pr-2 text-right text-muted"
                    >
                      {row.current}
                    </span>
                    <span role="cell" class="w-4 shrink-0 select-none text-muted">
                      {row.kind === 'added' ? '+' : row.kind === 'deleted' ? '−' : ' '}
                    </span>
                    <code role="cell" class="whitespace-pre">
                      <For each={tokens()[index]}>
                        {(token) => (
                          <span class={token.classes}>
                            <STokenText
                              token={token}
                              matches={props.matches}
                              activeMatch={props.activeMatch}
                            />
                          </span>
                        )}
                      </For>
                    </code>
                  </div>
                )}
              </Show>
            </>
          )}
        </For>
        <Show when={viewport.bottom() > 0}>
          <div
            aria-hidden="true"
            class="h-[var(--change-gap)]"
            style={{'--change-gap': `${viewport.bottom()}px`}}
          />
        </Show>
      </div>
    </div>
  )
}
