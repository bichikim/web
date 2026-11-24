import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'

import {createMemo, Show} from 'solid-js'
import type {TouchParameterBinding} from '@winter-love/wallpaper/settings/touch'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {SPoffoTouchParameterPicker} from './SPoffoTouchParameterPicker'
import {SPoffoTouchParameter} from './SPoffoTouchParameter'
import {SSettingsEditor} from './SSettingsEditor'

interface SPoffoTouchParametersProps {
  readonly source: ParameterSource
  readonly excluded?: ReadonlySet<string>
  /** Explicitly added parameters; omitted displays an empty list. */
  readonly value?: Readonly<Record<string, TouchParameterBinding>>
  /** Receives the new list after an add, edit, or removal. Omitted makes the controls readonly. */
  readonly onChange?: (
    parameters: Readonly<Record<string, TouchParameterBinding>>,
  ) => void | Promise<void>
}

/** Selects model parameters and edits only those added to touch input. */
export const SPoffoTouchParameters = (props: SPoffoTouchParametersProps) => {
  const disabled = () => props.onChange === undefined
  const configure = (id: string, patch: Partial<TouchParameterBinding>) =>
    props.onChange?.({...props.value, [id]: {...props.value?.[id], ...patch}})
  const catalog = createMemo(() =>
    (props.source.touchParameters?.() ?? []).filter(
      (parameter) => !props.excluded?.has(parameter.id),
    ),
  )
  const selected = createMemo(() => {
    const bindings = props.value ?? {}
    const ids = new Set(Object.keys(bindings))
    return catalog().filter(
      (parameter) => ids.has(parameter.id) && bindings[parameter.id]?.axis !== 'off',
    )
  })
  const available = createMemo(() =>
    catalog().filter((parameter) => !selected().some((item) => item.id === parameter.id)),
  )
  const options = createMemo(() =>
    selected().map((parameter) => ({
      keywords: `${parameter.id} ${parameter.name ?? ''}`,
      label: parameterName(parameter, interfaceLanguage.language()),
      value: parameter.id,
    })),
  )
  const handleAdd = async (id: string) => {
    if (!available().some((parameter) => parameter.id === id)) {
      return
    }
    const previous = props.value?.[id]
    await configure(id, {
      ...previous,
      axis: previous?.axis === 'off' ? 'auto' : (previous?.axis ?? 'auto'),
    })
  }
  const remove = (id: string) =>
    props.onChange?.(
      Object.fromEntries(Object.entries(props.value ?? {}).filter(([key]) => key !== id)),
    )
  const actions = () => (
    <div class="min-w-0 flex-1 basis-44">
      <SPoffoTouchParameterPicker
        parameters={available()}
        disabled={disabled() || props.source.loading() || catalog().length === 0}
        onSelect={handleAdd}
      />
    </div>
  )
  return (
    <section aria-label={uiText('터치 파라미터')} class="grid min-w-0 gap-3">
      <Show when={props.source.error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(message() ?? '')}
          </p>
        )}
      </Show>
      <SSettingsEditor label={uiText('개별 파라미터')} options={options()} actions={actions}>
        {(id) => (
          <SPoffoTouchParameter
            parameter={catalog().find((parameter) => parameter.id === id)!}
            value={props.value?.[id]}
            disabled={disabled()}
            onChange={(binding) => configure(id, binding)}
            onRemove={() => remove(id)}
          />
        )}
      </SSettingsEditor>
    </section>
  )
}
