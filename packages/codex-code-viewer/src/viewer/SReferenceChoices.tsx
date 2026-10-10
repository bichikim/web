import {createMemo, createSignal, Show} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'
import type {ContextMenuCloseOptions, ReferenceChoices} from './types'
import {SContextMenu} from './SContextMenu'
import {SReferenceList} from './SReferenceList'

interface SReferenceChoicesProps {
  readonly references: ReferenceChoices
  readonly previewLines?: number
  readonly onOpen?: (location: CodeLocation) => void
  readonly onClose?: () => void
}
/** Displays reference destinations beside the selected symbol with bounded scrolling. */
export const SReferenceChoices = (props: SReferenceChoicesProps) => {
  const [closed, setClosed] = createSignal(false)
  const title = createMemo(() => (props.references.kind === 'definition' ? '정의 위치' : '사용처'))
  const returnFocus = globalThis.document?.activeElement
  const close = (options?: ContextMenuCloseOptions): void => {
    setClosed(true)
    props.onClose?.()
    if (options?.restoreFocus !== false && returnFocus instanceof HTMLElement) {
      returnFocus.focus({preventScroll: true})
    }
  }
  const select = (location: CodeLocation): void => {
    close()
    props.onOpen?.(location)
  }
  return (
    <Show when={!closed()}>
      <SContextMenu
        x={props.references.point.x}
        y={props.references.point.y}
        label={title()}
        title={
          <>
            {`${props.references.label} · `}
            <Show when={props.references.status === 'searching'}>
              <span
                role="status"
                aria-label={`${title()} 검색 중`}
                class="mr-1.5 inline-flex align-middle"
              >
                <span
                  aria-hidden="true"
                  class="i-tabler-loader-2 h-3 w-3 animate-spin motion-reduce:animate-none"
                />
              </span>
            </Show>
            {`${title()} ${props.references.locations.length}개`}
          </>
        }
        emptyMessage={
          props.references.status === 'failed'
            ? `검색이 중단됐습니다. 찾은 ${title()}는 계속 확인할 수 있습니다.`
            : props.references.status === 'searching'
              ? undefined
              : props.references.locations.length === 0
                ? `작업 폴더 안에서 ${title()}를 찾지 못했습니다.`
                : undefined
        }
        maxHeight={320}
        width={480}
        items={[]}
        onClose={close}
      >
        <SReferenceList
          locations={props.references.locations}
          onSelect={select}
          previewLines={props.previewLines}
        />
      </SContextMenu>
    </Show>
  )
}
