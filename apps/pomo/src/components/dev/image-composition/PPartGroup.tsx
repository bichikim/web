import {cx} from 'class-variance-authority'
import {createMemo, createUniqueId, For, Show} from 'solid-js'
import {PPartRow} from './PPartRow'
import type {CompositionPart} from './types'

export interface PPartGroupProps {
  expanded?: boolean
  label: string
  isPartVisible?: (part: CompositionPart) => boolean
  onSelect?: (id: string) => void
  onToggle?: (label: string) => void
  onVisibility?: (ids: string | readonly string[], visible: boolean) => void
  parts?: readonly CompositionPart[]
  selectedId?: string
}

export function PPartGroup(props: PPartGroupProps) {
  const contentId = createUniqueId()
  const parts = () => props.parts ?? []
  const visibleCount = createMemo(() => parts().filter((part) => part.visible).length)
  const selected = createMemo(() => parts().find((part) => part.id === props.selectedId))
  const partial = () => visibleCount() > 0 && visibleCount() < parts().length
  const handleToggle = () => props.onToggle?.(props.label)
  const handleVisibility = (event: Event & {currentTarget: HTMLInputElement}) =>
    props.onVisibility?.(
      parts().map((part) => part.id),
      event.currentTarget.checked,
    )

  return (
    <section class="overflow-hidden rounded-lg border border-#ffffff/12">
      <div class="flex items-center gap-3 bg-#ffffff/4 px-3">
        <input
          aria-label={`${props.label} 그룹 표시`}
          checked={visibleCount() === parts().length && parts().length > 0}
          class="size-4 shrink-0 accent-#f0c99a"
          prop:indeterminate={partial()}
          onChange={handleVisibility}
          type="checkbox"
        />
        <button
          aria-controls={contentId}
          aria-expanded={props.expanded ?? false}
          aria-label={`${props.label} ${props.expanded ? '접기' : '펼치기'}`}
          class={cx(
            'flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left',
            'focus-visible:outline-2 focus-visible:outline-#f0c99a',
          )}
          onClick={handleToggle}
          type="button"
        >
          <span aria-hidden="true" class="text-xs text-#bdb2c4">
            {props.expanded ? '▾' : '▸'}
          </span>
          <span class="min-w-0 flex-1 py-2 text-sm font-700 text-#f4d7b5">
            {props.label}
            <Show when={selected()}>
              {(part) => (
                <span class="mt-1 block text-xs font-400 text-#bdb2c4">선택: {part().label}</span>
              )}
            </Show>
          </span>
          <span class="shrink-0 text-xs tabular-nums text-#bdb2c4">
            {visibleCount()}/{parts().length}
          </span>
        </button>
      </div>
      <div hidden={!props.expanded} id={contentId}>
        <div class="grid gap-1 py-2">
          <For each={parts()}>
            {(part) => (
              <PPartRow
                onSelect={props.onSelect}
                onVisibility={props.onVisibility}
                part={part}
                selected={part.id === props.selectedId}
                visibleInScene={props.isPartVisible?.(part)}
              />
            )}
          </For>
        </div>
      </div>
    </section>
  )
}
