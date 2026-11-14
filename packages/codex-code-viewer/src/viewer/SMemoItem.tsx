import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import {MAX_MEMO_LENGTH} from '../shared/memo-state'
import type {ContextMenuCloseOptions} from './types'
import {SContextMenu} from './SContextMenu'
import {SIcon} from './SIcon'
import {STooltip} from './STooltip'
import {SMemoSwipe} from './SMemoSwipe'
import {useTranslations} from './locale/use-translations'

interface SMemoItemProps {
  readonly text: string
  readonly saving?: boolean
  readonly actionsDisabled?: boolean
  readonly attaching?: boolean
  readonly onAttach?: () => Promise<void>
  readonly onEdit?: (text: string) => Promise<boolean>
  readonly onRemove?: () => Promise<boolean>
  readonly onEditingChange?: (editing: boolean) => void
}

export const SMemoItem = (props: SMemoItemProps) => {
  const t = useTranslations()
  const [draft, setDraft] = createSignal<string | null>(null)
  const blocked = createMemo(() => props.saving || props.actionsDisabled || draft() !== null)
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  const [actions, setActions] = createSignal<HTMLButtonElement | null>(null)
  const [menu, setMenu] = createSignal<{x: number; y: number} | null>(null)
  const handleMenu: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const rectangle = event.currentTarget.getBoundingClientRect()
    setMenu({x: rectangle.left, y: rectangle.bottom})
  }
  const handleClose = (options?: ContextMenuCloseOptions): void => {
    setMenu(null)
    if (options?.restoreFocus !== false) {
      actions()?.focus()
    }
  }
  const handleEdit = (): void => {
    setDraft(props.text)
    props.onEditingChange?.(true)
    input()?.focus()
  }
  const handleFinish = (): void => {
    setDraft(null)
    props.onEditingChange?.(false)
    actions()?.focus()
  }
  const handleKeyboard: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (event) => {
    if (event.key === 'Escape' && !event.isComposing && !props.saving) {
      event.preventDefault()
      event.stopPropagation()
      handleFinish()
    }
  }
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    if (await props.onEdit?.(draft() ?? '')) {
      handleFinish()
    }
  }
  return (
    <li class="min-w-0 border-b border-divider last:border-b-0">
      <SMemoSwipe disabled={blocked()} onAttach={props.onAttach} onRemove={props.onRemove}>
        <Show
          when={draft() !== null}
          fallback={
            <>
              <span class="min-w-0 flex-1 whitespace-pre-wrap break-words py-1.5 text-sm [overflow-wrap:anywhere]">
                {props.text}
              </span>
              <STooltip content={t('채팅에 추가')} placement="top">
                {(description) => (
                  <button
                    type="button"
                    class="ui-icon-button"
                    aria-label={t('채팅에 추가')}
                    aria-describedby={description}
                    disabled={props.onAttach === undefined || props.attaching}
                    onClick={() => props.onAttach?.()}
                  >
                    <SIcon name="addContext" />
                  </button>
                )}
              </STooltip>
              <Show when={props.onEdit !== undefined || props.onRemove !== undefined}>
                <STooltip content={t('메모 작업')} placement="top">
                  {(description) => (
                    <button
                      type="button"
                      class="ui-icon-button"
                      aria-label={t('메모 작업')}
                      aria-describedby={description}
                      aria-haspopup="menu"
                      aria-expanded={menu() !== null}
                      disabled={props.saving || props.actionsDisabled}
                      onClick={handleMenu}
                      ref={setActions}
                    >
                      <SIcon name="more" />
                    </button>
                  )}
                </STooltip>
              </Show>
            </>
          }
        >
          <form class="flex min-w-0 flex-1 items-center gap-2" onSubmit={handleSubmit}>
            <input
              aria-label={t('메모 수정')}
              class="ui-input min-w-0 flex-1 py-1.5"
              maxLength={MAX_MEMO_LENGTH}
              readOnly={props.saving}
              value={draft() ?? ''}
              onInput={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={handleKeyboard}
              ref={setInput}
            />
            <STooltip content={t('저장')} placement="top">
              {(description) => (
                <button
                  type="submit"
                  class="ui-icon-button"
                  aria-label={t('저장')}
                  aria-describedby={description}
                  disabled={props.saving || (draft()?.trim() ?? '') === ''}
                >
                  <SIcon name="check" />
                </button>
              )}
            </STooltip>
            <STooltip content={t('취소')} placement="top">
              {(description) => (
                <button
                  type="button"
                  class="ui-icon-button"
                  aria-label={t('취소')}
                  aria-describedby={description}
                  disabled={props.saving}
                  onClick={handleFinish}
                >
                  <SIcon name="close" />
                </button>
              )}
            </STooltip>
          </form>
        </Show>
      </SMemoSwipe>
      <Show when={menu()}>
        {(position) => (
          <SContextMenu
            x={position().x}
            y={position().y}
            label={t('메모 작업')}
            items={[
              {
                label: t('수정'),
                onSelect: props.onEdit === undefined || props.saving ? undefined : handleEdit,
              },
              {
                label: t('삭제'),
                onSelect: props.saving ? undefined : props.onRemove,
              },
            ]}
            onClose={handleClose}
          />
        )}
      </Show>
    </li>
  )
}
