import {createMemo, createSignal, For, Show} from 'solid-js'
import type {NavigationLocation} from '../shared/contracts'
import {REFERENCE_ROW_HEIGHT, useReferenceList} from './use-reference-list'

interface SReferenceListProps {
  readonly locations: readonly NavigationLocation[]
  readonly previewLines?: number
  readonly onSelect: (location: NavigationLocation) => void
}
/** Renders collapsible file groups with bounded scrolling and keyboard access. */
export const SReferenceList = (props: SReferenceListProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const lineHeight = 18
  const rowPadding = 12
  const rowHeight = createMemo(() =>
    Math.max(REFERENCE_ROW_HEIGHT, (props.previewLines ?? 2) * lineHeight + rowPadding),
  )
  const list = useReferenceList({element, locations: () => props.locations, rowHeight})
  return (
    <div
      ref={setElement}
      class="max-h-[min(260px,calc(100dvh-80px))] overflow-y-auto"
      style={{'--reference-row-height': `${rowHeight()}px`}}
      onScroll={list.scroll}
      onKeyDown={list.handleKeyboard}
    >
      <For each={list.rows()}>
        {(key) => (
          <div class="pt-[var(--reference-gap)]" style={{'--reference-gap': `${list.gap(key)}px`}}>
            <Show when={list.header(key)}>
              {(header) => (
                <button
                  class="ui-reference-row flex h-[var(--reference-row-height)] w-full items-center
                    gap-2 rounded-row px-3 text-left text-xs font-semibold"
                  role="menuitem"
                  tabindex="-1"
                  type="button"
                  value={key}
                  aria-label={`${header().path} · ${header().count}개`}
                  aria-expanded={list.expanded(header().path)}
                  aria-posinset={list.position(key)}
                  aria-setsize={list.size()}
                  title={header().path}
                  onFocus={() => list.focus(key)}
                  onClick={() => list.toggle(header().path)}
                >
                  <span
                    aria-hidden="true"
                    class="i-tabler-chevron-right h-3 w-3 shrink-0"
                    classList={{'rotate-90': list.expanded(header().path)}}
                  />
                  <span class="min-w-0 flex-1 truncate">{header().path}</span>
                  <span class="shrink-0 font-normal text-muted">{header().count}개</span>
                </button>
              )}
            </Show>
            <Show when={list.destination(key)}>
              {(destination) => (
                <button
                  class="ui-reference-row grid h-[var(--reference-row-height)] w-full
                    grid-cols-[max-content_minmax(0,1fr)] content-center items-start gap-x-3
                    rounded-row px-3 text-left text-xs leading-4.5"
                  role="menuitem"
                  tabindex="-1"
                  type="button"
                  value={key}
                  aria-posinset={list.position(key)}
                  aria-setsize={list.size()}
                  aria-description={destination().location.path}
                  title={destination().location.path}
                  onFocus={() => list.focus(key)}
                  onClick={() => props.onSelect(destination().location)}
                >
                  <span class="shrink-0 font-mono tabular-nums text-muted">
                    {destination().location.line}:{destination().location.column}
                  </span>
                  <Show when={destination().location.preview}>
                    {' '}
                    <code class="min-w-0 font-mono" title={destination().location.preview}>
                      <For
                        each={destination()
                          .location.preview?.split('\n')
                          .slice(0, props.previewLines ?? 2)}
                      >
                        {(line) => (
                          <span class="block h-4.5 truncate whitespace-pre">{line || ' '}</span>
                        )}
                      </For>
                    </code>
                  </Show>
                </button>
              )}
            </Show>
          </div>
        )}
      </For>
      <div
        aria-hidden="true"
        class="h-[var(--reference-gap)]"
        style={{'--reference-gap': `${list.bottom()}px`}}
      />
    </div>
  )
}
