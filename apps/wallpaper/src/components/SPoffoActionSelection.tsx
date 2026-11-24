import {text as uiText} from '../features/localization'
import {createMemo, createSignal, Index, Show, untrack} from 'solid-js'
import {SEMANTIC_ACTION_LIMIT, type SemanticAction} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction} from '../features/semantics/types'
import {SSelect} from './SSelect'

interface SPoffoActionSelectionProps {
  readonly value?: readonly SemanticAction[]
  readonly actions?: readonly CharacterAction[]
  readonly label?: string
  readonly disabled?: boolean
  readonly onChange?: (value: readonly SemanticAction[]) => void | Promise<void>
}
const targetKey = (action: SemanticAction) => `${action.kind}:${action.id}`

export const SPoffoActionSelection = (props: SPoffoActionSelectionProps) => {
  const [adding, setAdding] = createSignal(false)
  const [container, setContainer] = createSignal<HTMLDivElement | null>(null)
  const value = () => props.value ?? []
  const caption = () => props.label ?? uiText('연결')
  const disabled = () => props.disabled || props.onChange === undefined
  const rows = createMemo(() =>
    value().length === 0 ? [null] : [...value(), ...(adding() ? [null] : [])],
  )
  const remaining = () =>
    (props.actions ?? []).filter(
      (item) => !value().some((target) => targetKey(target) === targetKey(item.action)),
    )
  const choices = (index: number) => [
    {
      get label() {
        return uiText('행동 선택')
      },
      value: '',
    },
    ...(props.actions ?? [])
      .filter(
        (item) =>
          !value().some(
            (target, other) => other !== index && targetKey(target) === targetKey(item.action),
          ),
      )
      .map((item) => ({label: item.label, value: targetKey(item.action)})),
  ]
  const focusRow = (index: number) =>
    queueMicrotask(() => {
      const element = untrack(container)
      if (element === null || !element.isConnected) {
        return
      }
      const inputs = element.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')
      inputs.item(Math.max(0, Math.min(index, inputs.length - 1)))?.focus()
    })
  const handleAdd = () => {
    setAdding(true)
    focusRow(value().length)
  }
  const handleRemove = async (index: number) => {
    if (index < value().length) {
      await props.onChange?.(value().filter((_, other) => other !== index))
    }
    setAdding(false)
    focusRow(index)
  }
  const handleSelect = async (index: number, key: string) => {
    const target = props.actions?.find((item) => targetKey(item.action) === key)?.action
    if (target === undefined) {
      await handleRemove(index)
      return
    }
    const next =
      index === value().length
        ? [...value(), target]
        : value().map((item, other) => (other === index ? target : item))
    await props.onChange?.(next)
    setAdding(false)
    focusRow(index)
  }
  return (
    <div ref={setContainer} class="grid min-w-0 gap-2">
      <Index each={rows()}>
        {(target, index) => {
          const handleChange = (key: string) => handleSelect(index, key)
          const handleDelete = () => handleRemove(index)
          return (
            <div class="flex min-w-0 items-center gap-2">
              <div class="min-w-0 flex-1">
                <SSelect
                  label={uiText('{value0} 행동{value1}', {
                    value0: String(caption()),
                    value1: String(index === 0 ? '' : ` ${index + 1}`),
                  })}
                  value={target() === null ? '' : targetKey(target()!)}
                  options={choices(index)}
                  disabled={disabled()}
                  onChange={handleChange}
                />
              </div>
              <Show when={target() !== null || adding()}>
                <button
                  type="button"
                  aria-label={uiText('{value0} 행동 {value1} 삭제', {
                    value0: String(caption()),
                    value1: String(index + 1),
                  })}
                  disabled={disabled()}
                  onClick={handleDelete}
                  class="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-solid
                  border-stone-300 bg-white text-stone-600 disabled:opacity-40"
                >
                  ×
                </button>
              </Show>
            </div>
          )
        }}
      </Index>
      <Show when={value().length > 0}>
        <button
          type="button"
          aria-label={uiText('{value0} 행동 추가', {value0: String(caption())})}
          onClick={handleAdd}
          disabled={
            disabled() ||
            adding() ||
            value().length >= SEMANTIC_ACTION_LIMIT ||
            remaining().length === 0
          }
          class="wallpaper-file-button justify-self-start"
        >
          {uiText('행동 추가')}
        </button>
      </Show>
    </div>
  )
}
