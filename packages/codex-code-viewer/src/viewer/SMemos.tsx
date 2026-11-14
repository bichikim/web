import {createSignal, For, type JSX, Show} from 'solid-js'
import type {ViewerMemos} from './use-memos'
import {useTranslations} from './locale/use-translations'
import {SIcon} from './SIcon'
import {STooltip} from './STooltip'
import {MAX_MEMO_ITEMS, MAX_MEMO_LENGTH} from '../shared/memo-state'
import {SMemoItem} from './SMemoItem'

interface SMemosProps {
  readonly memos: ViewerMemos
}

export const SMemos = (props: SMemosProps) => {
  const t = useTranslations()
  const [draft, setDraft] = createSignal('')
  const [editing, setEditing] = createSignal(false)
  const [list, setList] = createSignal<HTMLUListElement | null>(null)
  const [input, setInput] = createSignal<HTMLInputElement | null>(null)
  const focusItem = (index: number): void => {
    const rows = list()?.children
    const row = rows?.item(Math.min(index, rows.length - 1))
    const button = row?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
    const destination = button ?? input()
    destination?.focus()
  }
  const handleEdit = async (index: number, text: string): Promise<boolean> => {
    const saved = await props.memos.edit(index, text)
    if (saved) {
      setEditing(false)
      focusItem(index)
    }
    return saved
  }
  const handleRemove = async (index: number): Promise<boolean> => {
    const saved = await props.memos.remove(index)
    if (saved) {
      focusItem(index)
    }
    return saved
  }
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    const value = draft()
    if ((await props.memos.add(value)) && draft() === value) {
      setDraft('')
    }
  }
  return (
    <section
      id="viewer-memos"
      aria-label={t('메모')}
      hidden={!props.memos.visible()}
      class="shrink-0 border-t border-divider bg-canvas"
    >
      <button
        type="button"
        class="ui-focus flex w-full items-center gap-2 px-4 py-2 text-sm"
        aria-label={t(props.memos.expanded() ? '메모 접기' : '메모 펼치기')}
        aria-expanded={props.memos.expanded()}
        aria-controls="viewer-memo-list"
        onClick={() => props.memos.toggleExpanded()}
      >
        <SIcon name="memo" />
        <span>{t('메모')}</span>
        <Show when={props.memos.items().length > 0}>
          <span class="text-xs text-muted">{props.memos.items().length}</span>
        </Show>
        <span class="ml-auto inline-flex" classList={{'rotate-180': props.memos.expanded()}}>
          <SIcon name="chevronDown" />
        </span>
      </button>
      <div id="viewer-memo-list" hidden={!props.memos.expanded()}>
        <Show
          when={props.memos.ready()}
          fallback={
            <div class="px-4 pb-3">
              <button
                type="button"
                class="ui-button"
                disabled={props.memos.loading()}
                onClick={() => props.memos.reload()}
              >
                {t(props.memos.loading() ? '불러오는 중…' : '다시 시도')}
              </button>
            </div>
          }
        >
          <ul
            aria-label={t('메모 목록')}
            class="m-0 max-h-40 list-none overflow-y-auto px-4 p-0"
            ref={setList}
          >
            <For each={props.memos.items()}>
              {(text, index) => (
                <SMemoItem
                  text={text}
                  saving={props.memos.saving()}
                  actionsDisabled={editing()}
                  onEditingChange={setEditing}
                  attaching={props.memos.attaching() !== null}
                  onAttach={props.memos.canAttach ? () => props.memos.attach(text) : undefined}
                  onEdit={(value) => handleEdit(index(), value)}
                  onRemove={() => handleRemove(index())}
                />
              )}
            </For>
          </ul>
          <form class="mx-4 mt-1 mb-3 flex items-center gap-2" onSubmit={handleSubmit}>
            <input
              aria-label={t('새 메모')}
              placeholder={t('메모 추가…')}
              maxLength={MAX_MEMO_LENGTH}
              class="ui-input min-w-0 flex-1 py-1.5"
              value={draft()}
              ref={setInput}
              onInput={(event) => setDraft(event.currentTarget.value)}
            />
            <STooltip content={t('메모 추가')} placement="top">
              {(description) => (
                <button
                  type="submit"
                  class="ui-icon-button"
                  aria-label={t('메모 추가')}
                  aria-describedby={description}
                  disabled={
                    props.memos.saving() ||
                    draft().trim() === '' ||
                    props.memos.items().length >= MAX_MEMO_ITEMS
                  }
                >
                  <SIcon name="add" />
                </button>
              )}
            </STooltip>
          </form>
        </Show>
      </div>
    </section>
  )
}
