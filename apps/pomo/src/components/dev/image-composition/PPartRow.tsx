import {cx} from 'class-variance-authority'
import {Match, Switch} from 'solid-js'
import type {CompositionPart} from './types'

export interface PPartRowProps {
  part: CompositionPart
  selected?: boolean
  visibleInScene?: boolean
  onSelect?: (id: string) => void
  onVisibility?: (id: string, visible: boolean) => void
}

export function PPartRow(props: PPartRowProps) {
  const handleSelect = () => props.onSelect?.(props.part.id)
  const handleVisibility = (event: Event & {currentTarget: HTMLInputElement}) =>
    props.onVisibility?.(props.part.id, event.currentTarget.checked)

  return (
    <div
      class="flex items-center gap-3 rounded-lg px-3 py-1"
      classList={{'bg-#f0c99a/12': props.selected}}
    >
      <input
        aria-label={`${props.part.label} 표시`}
        checked={props.part.visible}
        class="size-4 accent-#f0c99a"
        onChange={handleVisibility}
        type="checkbox"
      />
      <button
        aria-label={`${props.part.label} 선택`}
        aria-pressed={props.selected ?? false}
        class={cx(
          'flex min-h-9 flex-1 items-center justify-between gap-3 text-left text-sm text-white',
          'focus-visible:outline-2 focus-visible:outline-#f0c99a',
        )}
        onClick={handleSelect}
        type="button"
      >
        {props.part.label}
        <span class="text-xs text-#bdb2c4">
          <Switch fallback="표시 중">
            <Match when={!props.part.visible}>숨김</Match>
            <Match when={props.visibleInScene === false}>연동 숨김</Match>
          </Switch>
        </span>
      </button>
    </div>
  )
}
