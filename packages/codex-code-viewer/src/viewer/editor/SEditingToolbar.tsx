import {STooltip} from '../STooltip'
import {useTranslations} from '../locale/use-translations'
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
  const t = useTranslations()
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
      aria-label={t('코드 편집')}
      role="group"
      class="ml-auto flex min-w-0 shrink-0 items-center gap-2"
    >
      <Show when={props.editing.enabled() || props.editing.deleted()}>
        <STooltip content="Cmd/Ctrl+S">
          {(description) => (
            <button
              aria-describedby={description}
              type="button"
              class="ui-document-button"
              disabled={!mutable()}
              onClick={() => props.editing.save()}
            >
              {props.editing.saving() ? t('저장 중…') : t('저장')}
            </button>
          )}
        </STooltip>
        <STooltip content={t('편집 더 보기')}>
          {(description) => (
            <button
              aria-describedby={description}
              type="button"
              class="ui-document-button px-2"
              aria-label={t('편집 더 보기')}
              aria-haspopup="menu"
              aria-expanded={menu() !== null}
              disabled={!mutable()}
              onClick={handleOpen}
              ref={setButton}
            >
              <span aria-hidden="true" class="i-tabler-dots" />
            </button>
          )}
        </STooltip>
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
        {t('편집')}
      </button>
      <Show when={menu()} keyed>
        {(position) => (
          <SContextMenu
            x={position.x}
            y={position.y}
            label={t('편집 작업')}
            onClose={handleClose}
            items={[
              {
                label: t('변경 내용 채팅에 추가'),
                onSelect: mutable() ? props.onShareChanges : undefined,
              },
              {label: t('변경 버리기'), onSelect: mutable() ? props.onDiscard : undefined},
            ]}
          />
        )}
      </Show>
    </div>
  )
}
