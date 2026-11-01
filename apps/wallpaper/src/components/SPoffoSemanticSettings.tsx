import {createEffect, createMemo, createSignal, For, onCleanup, Show} from 'solid-js'
import {SEMANTIC_LIMIT, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import type {CharacterAction} from '../features/semantics/types'
import {useSemanticRuntime} from '../features/semantics/context'
import {SPoffoSemanticBinding} from './SPoffoSemanticBinding'

interface SPoffoSemanticSettingsProps {
  readonly widgetId?: string
  readonly actions?: readonly CharacterAction[]
  readonly loading?: boolean
  readonly value?: readonly SemanticBinding[]
  readonly onChange?: (value: readonly SemanticBinding[]) => void | Promise<void>
}
const groupName = (binding: SemanticBinding) => binding.exclusiveGroup?.trim() || '기본 그룹'

export const SPoffoSemanticSettings = (props: SPoffoSemanticSettingsProps) => {
  const runtime = useSemanticRuntime()
  const [text, setText] = createSignal('')
  const groups = createMemo(() => [...new Set((props.value ?? []).map(groupName))])
  createEffect(() => {
    const id = props.widgetId
    onCleanup(() => {
      if (id !== undefined) {
        runtime?.preview(id, null)
      }
    })
  })
  const update = (id: string, patch: Partial<SemanticBinding>) =>
    props.onChange?.(
      (props.value ?? []).map((item) => (item.id === id ? {...item, ...patch} : item)),
    )
  const add = () =>
    props.onChange?.([
      ...(props.value ?? []),
      {
        enabled: true,
        id: crypto.randomUUID(),
        mode: 'toggle',
        parameterId: null,
        text: '',
        threshold: 0.75,
      },
    ])
  const test = () => {
    const id = props.widgetId
    if (id !== undefined) {
      runtime?.test(id, text())
    }
  }
  return (
    <section
      aria-label="감정·내용 연결"
      class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-3 text-[13px]"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="m-0 font-medium text-stone-700">감정·내용</h3>
        <button
          type="button"
          onClick={add}
          disabled={props.onChange === undefined || (props.value?.length ?? 0) >= SEMANTIC_LIMIT}
          class="cursor-pointer rounded-md border border-solid border-stone-300 bg-white
          px-2 py-1 text-xs disabled:opacity-40"
        >
          연결 추가
        </button>
      </div>
      <For each={groups()}>
        {(group) => (
          <details
            open={group === '기본 그룹'}
            class="min-w-0 rounded-lg border border-solid border-stone-200 p-3"
          >
            <summary
              class="cursor-pointer text-[13px] font-medium text-stone-700
              focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {group}
              <span class="ml-1 text-xs font-normal text-stone-500">
                {(props.value ?? []).filter((binding) => groupName(binding) === group).length}
              </span>
            </summary>
            <div class="mt-3 grid gap-3">
              <For
                each={(props.value ?? [])
                  .filter((binding) => groupName(binding) === group)
                  .map((binding) => binding.id)}
              >
                {(id) => {
                  const binding = () => props.value!.find((item) => item.id === id)!
                  const handleChange = (value: SemanticBinding) => update(id, value)
                  const handleRemove = () =>
                    props.onChange?.((props.value ?? []).filter((item) => item.id !== id))
                  return (
                    <SPoffoSemanticBinding
                      score={runtime?.score(props.widgetId ?? '', id)}
                      value={binding()}
                      label={`연결 ${(props.value ?? []).findIndex((item) => item.id === id) + 1}`}
                      actions={props.actions}
                      loading={props.loading}
                      widgetId={props.widgetId}
                      onChange={props.onChange === undefined ? undefined : handleChange}
                      onRemove={props.onChange === undefined ? undefined : handleRemove}
                    />
                  )
                }}
              </For>
            </div>
          </details>
        )}
      </For>
      <Show when={(props.value?.length ?? 0) > 0 && runtime !== undefined}>
        <div class="grid gap-2">
          <textarea
            aria-label="분석할 문장"
            placeholder="연결을 시험할 문장"
            value={text()}
            maxLength={4096}
            rows={2}
            onInput={(event) => setText(event.currentTarget.value)}
            class="box-border w-full resize-y rounded-md border border-solid border-stone-300 bg-white
          px-2 py-1.5 font-inherit text-inherit"
          />
          <button
            type="button"
            onClick={test}
            disabled={runtime?.busy() || text().trim() === ''}
            class="justify-self-start cursor-pointer rounded-md border border-solid border-stone-300 bg-white
          px-3 py-1.5 disabled:opacity-40"
          >
            {runtime?.busy() ? '분석 중…' : '문장 테스트'}
          </button>
          <Show when={runtime?.error()}>
            <p role="alert" class="m-0 text-xs text-red-700">
              {runtime?.error()}
            </p>
          </Show>
        </div>
      </Show>
    </section>
  )
}
