import {createSignal, Show} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import type {ContextMenuCloseOptions, ReferenceChoices} from './types'
import {SContextMenu} from './SContextMenu'

interface SReferenceChoicesProps {
  readonly references: ReferenceChoices
  readonly onOpen?: (location: CodeLocation) => void
}
/** Displays reference destinations beside the selected symbol with bounded scrolling. */
export const SReferenceChoices = (props: SReferenceChoicesProps) => {
  const [closed, setClosed] = createSignal(false)
  const returnFocus = globalThis.document?.activeElement
  const close = (options?: ContextMenuCloseOptions): void => {
    setClosed(true)
    if (options?.restoreFocus !== false && returnFocus instanceof HTMLElement) {
      returnFocus.focus({preventScroll: true})
    }
  }
  return (
    <Show when={!closed()}>
      <SContextMenu
        x={props.references.point.x}
        y={props.references.point.y}
        label="사용처"
        title={`${props.references.label} · 사용처 ${props.references.locations.length}개`}
        emptyMessage="작업 폴더 안에서 사용처를 찾지 못했습니다."
        maxHeight={320}
        width={480}
        items={props.references.locations.map((location) => ({
          description: location.preview,
          group: location.path,
          label: `${location.line}:${location.column}`,
          onSelect: () => props.onOpen?.(location),
        }))}
        onClose={close}
      />
    </Show>
  )
}
