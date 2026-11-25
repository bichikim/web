import {cx} from 'class-variance-authority'
import {createMemo, createSignal, For, untrack} from 'solid-js'
import {PPartGroup} from './PPartGroup'
import type {CompositionPart} from './types'

export interface PPartListProps {
  isPartVisible?: (part: CompositionPart) => boolean
  onSelect?: (id: string) => void
  onVisibility?: (ids: string | readonly string[], visible: boolean) => void
  parts?: readonly CompositionPart[]
  selectedId?: string
}

export function PPartList(props: PPartListProps) {
  const groups = createMemo(() => [
    ...new Set((props.parts ?? []).map((part) => part.panelGroup ?? '기타 파트')),
  ])
  const [expanded, setExpanded] = createSignal<readonly string[]>(
    untrack(() => [
      props.parts?.find((part) => part.id === props.selectedId)?.panelGroup ?? '기타 파트',
    ]),
  )
  const handleToggle = (label: string) =>
    setExpanded((current) =>
      current.includes(label) ? current.filter((group) => group !== label) : [...current, label],
    )
  const handleExpand = () => setExpanded(groups())
  const handleCollapse = () => setExpanded([])

  return (
    <div class="grid gap-2">
      <div class="mb-1 flex flex-wrap gap-3 text-xs text-#f4d7b5">
        <button
          class={cx(
            'min-h-8 underline-offset-3 hover:underline',
            'focus-visible:outline-2 focus-visible:outline-#f0c99a',
          )}
          onClick={handleExpand}
          type="button"
        >
          그룹 모두 펼치기
        </button>
        <button
          class={cx(
            'min-h-8 underline-offset-3 hover:underline',
            'focus-visible:outline-2 focus-visible:outline-#f0c99a',
          )}
          onClick={handleCollapse}
          type="button"
        >
          그룹 모두 접기
        </button>
      </div>
      <For each={groups()}>
        {(label) => (
          <PPartGroup
            expanded={expanded().includes(label)}
            isPartVisible={props.isPartVisible}
            label={label}
            onSelect={props.onSelect}
            onToggle={handleToggle}
            onVisibility={props.onVisibility}
            parts={(props.parts ?? []).filter((part) => (part.panelGroup ?? '기타 파트') === label)}
            selectedId={props.selectedId}
          />
        )}
      </For>
    </div>
  )
}
