import {createSignal, Show} from 'solid-js'
import type {useCodeEditing} from '../use-code-editing'
import {SContextMenu} from '../SContextMenu'
import type {ContextMenuCloseOptions} from '../types'

interface SEditingToolbarProps {
  readonly editing: ReturnType<typeof useCodeEditing>
  readonly onDiscard?: () => void
  readonly onShareChanges?: () => void
}
interface MenuPosition {
  readonly x: number
  readonly y: number
}
export const SEditingToolbar = (props: SEditingToolbarProps) => {
  const [menu, setMenu] = createSignal<MenuPosition | null>(null)
  const [button, setButton] = createSignal<HTMLButtonElement | null>(null)
  const handleOpen = (event: MouseEvent): void => {
    const rectangle =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.getBoundingClientRect()
        : undefined
    if (rectangle !== undefined) {
      setMenu({x: rectangle.left, y: rectangle.bottom})
    }
  }
  const handleClose = (options?: ContextMenuCloseOptions): void => {
    setMenu(null)
    if (options?.restoreFocus !== false) {
      button()?.focus({preventScroll: true})
    }
  }
  const mutable = (): boolean => props.editing.dirty() && !props.editing.saving()
  return (
    <div
      aria-label="코드 편집"
      role="group"
      class="ml-auto flex min-w-0 shrink-0 items-center gap-2"
    >
      <Show when={props.editing.enabled() || props.editing.deleted()}>
        <button
          type="button"
          class="ui-document-button"
          disabled={!mutable()}
          onClick={() => props.editing.save()}
          title="Cmd/Ctrl+S"
        >
          {props.editing.saving() ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          class="ui-document-button px-2"
          aria-label="편집 더 보기"
          aria-haspopup="menu"
          aria-expanded={menu() !== null}
          disabled={!mutable()}
          onClick={handleOpen}
          ref={setButton}
        >
          <span aria-hidden="true" class="i-tabler-dots" />
        </button>
      </Show>
      <button
        type="button"
        class="ui-document-button aria-pressed:bg-selection aria-pressed:text-tree-icon"
        aria-pressed={props.editing.enabled()}
        onClick={() => props.editing.toggle()}
      >
        <span
          aria-hidden="true"
          class={props.editing.enabled() ? 'i-tabler-check' : 'i-tabler-pencil'}
        />
        편집
      </button>
      <Show when={menu()} keyed>
        {(position) => (
          <SContextMenu
            x={position.x}
            y={position.y}
            label="편집 작업"
            onClose={handleClose}
            items={[
              {
                label: '변경 내용 채팅에 추가',
                onSelect: mutable() ? props.onShareChanges : undefined,
              },
              {label: '변경 버리기', onSelect: mutable() ? props.onDiscard : undefined},
            ]}
          />
        )}
      </Show>
    </div>
  )
}
