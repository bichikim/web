import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'

import {createEffect, createMemo, createSignal, on, onCleanup, Show} from 'solid-js'
import {SEMANTIC_LIMIT, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {semanticTargets} from '@winter-love/wallpaper/settings/semantic-targets'
import type {CharacterAction} from '../features/semantics/types'
import {useSemanticRuntime} from '../features/semantics/context'
import {SPoffoSemanticBinding} from './SPoffoSemanticBinding'
import {SSettingsEditor} from './SSettingsEditor'
import {actionLabel} from '../features/semantics/action-label'

interface SPoffoSemanticSettingsProps {
  readonly widgetId?: string
  readonly actions?: readonly CharacterAction[]
  readonly loading?: boolean
  readonly value?: readonly SemanticBinding[]
  readonly onChange?: (value: readonly SemanticBinding[]) => void | Promise<void>
}
const groupName = (binding: SemanticBinding) =>
  binding.exclusiveGroup?.trim() || uiText('기본 그룹')
const CATEGORIES = {
  get behavior() {
    return uiText('랜덤 행동')
  },
  get emotion() {
    return uiText('내용 반응')
  },
  get menu() {
    return uiText('우클릭 메뉴')
  },
}
const CAPTION_LENGTH = 64

export const SPoffoSemanticSettings = (props: SPoffoSemanticSettingsProps) => {
  const runtime = useSemanticRuntime()
  const [text, setText] = createSignal('')
  const options = createMemo(() =>
    (props.value ?? []).map((binding, index) => {
      const actions = semanticTargets(binding)
        .map((target) => actionLabel(target, props.actions))
        .join(' + ')
      return {
        get description() {
          return [
            groupName(binding),
            CATEGORIES[binding.category ?? 'emotion'],
            ...(binding.enabled ? [] : [uiText('꺼짐')]),
          ].join(' · ')
        },
        keywords: `${actions} ${binding.text} ${binding.id}`,
        get label() {
          return (
            binding.menuLabel?.trim() ||
            actions ||
            binding.text.trim().slice(0, CAPTION_LENGTH) ||
            uiText('연결 {value0}', {value0: String(index + 1)})
          )
        },
        value: binding.id,
      }
    }),
  )
  createEffect(
    on(
      () => props.widgetId,
      (id) => {
        onCleanup(() => {
          if (id !== undefined) {
            runtime?.preview(id, null)
          }
        })
      },
    ),
  )
  const update = (id: string, patch: Partial<SemanticBinding>) =>
    props.onChange?.(
      (props.value ?? []).map((item) => (item.id === id ? {...item, ...patch} : item)),
    )
  const add = async (edit: (id: string) => void) => {
    const id = crypto.randomUUID()
    await props.onChange?.([
      ...(props.value ?? []),
      {
        enabled: true,
        examples: [{language: interfaceLanguage.language(), text: ''}],
        id,
        mode: 'toggle',
        parameterId: null,
        text: '',
        threshold: 0.75,
      },
    ])
    edit(id)
  }
  const handleChange = (value: SemanticBinding) => update(value.id, value)
  const remove = (id: string) =>
    props.onChange?.((props.value ?? []).filter((binding) => binding.id !== id))
  const stopPreview = () => {
    const id = props.widgetId
    if (id !== undefined) {
      runtime?.preview(id, null)
    }
  }
  const actions = (edit: (id: string) => void) => {
    const handleAdd = () => add(edit)
    return (
      <div class="grid w-full gap-3">
        <Show when={(props.value?.length ?? 0) > 0 && runtime !== undefined}>
          <div class="grid gap-2">
            <textarea
              aria-label={uiText('분석할 문장')}
              placeholder={uiText('연결을 시험할 문장')}
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
              class="wallpaper-file-button justify-self-start text-xs disabled:opacity-40"
            >
              {runtime?.busy() ? uiText('분석 중…') : uiText('문장 테스트')}
            </button>
            <Show when={runtime?.error()}>
              <p role="alert" class="m-0 text-xs text-red-700">
                {localizeMessage(runtime?.error() ?? '')}
              </p>
            </Show>
          </div>
        </Show>
        <button
          type="button"
          onClick={handleAdd}
          disabled={props.onChange === undefined || (props.value?.length ?? 0) >= SEMANTIC_LIMIT}
          class="wallpaper-file-button justify-self-start text-xs disabled:opacity-40"
        >
          {uiText('연결 추가')}
        </button>
      </div>
    )
  }
  const test = () => {
    const id = props.widgetId
    if (id !== undefined) {
      runtime?.test(id, text())
    }
  }
  return (
    <section aria-label={uiText('행동 연결')} class="grid min-w-0 gap-3 text-[13px]">
      <SSettingsEditor
        label={uiText('행동 연결')}
        options={options()}
        actions={actions}
        onSelect={stopPreview}
      >
        {(id) => (
          <SPoffoSemanticBinding
            score={runtime?.score(props.widgetId ?? '', id)}
            value={props.value!.find((binding) => binding.id === id)!}
            label={uiText('연결 {value0}', {
              value0: String((props.value ?? []).findIndex((binding) => binding.id === id) + 1),
            })}
            actions={props.actions}
            loading={props.loading}
            widgetId={props.widgetId}
            onChange={props.onChange === undefined ? undefined : handleChange}
            onRemove={props.onChange === undefined ? undefined : () => remove(id)}
          />
        )}
      </SSettingsEditor>
    </section>
  )
}
