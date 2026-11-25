import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'

import {createMemo, createSignal, For, Show} from 'solid-js'
import type {
  PoffoTracking,
  PoffoTrackingBinding,
  PoffoTrackingBindings,
} from '@winter-love/wallpaper/settings/tracking'
import {
  resolveTrackingInversion,
  resolveTrackingParameter,
  TRACKING_AXES,
} from '../features/tracking/parameters'
import {type ParameterSource, useParameters} from '../features/tracking/use-parameters'
import {SSelect} from './SSelect'

interface SPoffoTrackingBindingsProps {
  readonly mode?: PoffoTracking
  readonly source?: ParameterSource
  readonly disclosure?: boolean
  readonly assetId: string | null
  readonly load: (id: string) => Promise<string | Blob>
  readonly value?: PoffoTrackingBindings
  readonly onChange?: (bindings: PoffoTrackingBindings) => void | Promise<void>
}
const PARAMETER_PREFIX = 'id:'
export const SPoffoTrackingBindings = (props: SPoffoTrackingBindingsProps) => {
  const [open, setOpen] = createSignal(false)
  const own = useParameters({
    assetId: () => props.assetId,
    enabled: () => props.source === undefined && (props.disclosure === false || open()),
    load: (id) => props.load(id),
  })
  const source = createMemo(() => props.source ?? own)
  const handleToggle = (event: Event) => setOpen((event.currentTarget as HTMLDetailsElement).open)
  const update = (key: keyof PoffoTrackingBindings, patch: PoffoTrackingBinding) =>
    props.onChange?.({...props.value, [key]: {...props.value?.[key], ...patch}})
  const fields = (
    <Show when={(props.disclosure === false || open()) && !source().loading()}>
      <Show when={source().error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(message() ?? '')}
          </p>
        )}
      </Show>
      <For
        each={TRACKING_AXES.filter((axis) => axis.key !== 'headZ' || props.mode === 'camera-pose')}
      >
        {(axis) => {
          const binding = () => props.value?.[axis.key]
          const selected = () => binding()?.parameterId
          const automatic = () => resolveTrackingParameter(source().parameters(), axis.key)
          const automaticLabel = () => {
            const parameter = automatic()
            return parameter === undefined
              ? uiText('연결 없음')
              : parameterName(parameter, interfaceLanguage.language())
          }
          const options = () => [
            {
              get label() {
                return uiText('자동 · {value0}', {value0: String(automaticLabel())})
              },
              value: 'auto',
            },
            {
              get label() {
                return uiText('사용 안 함')
              },
              value: 'none',
            },
            ...source()
              .parameters()
              .map((parameter) => ({
                label: parameterName(parameter, interfaceLanguage.language()),
                value: `id:${parameter.id}`,
              })),
            ...(typeof selected() === 'string' &&
            !source()
              .parameters()
              .some((parameter) => parameter.id === selected())
              ? [
                  {
                    get label() {
                      return uiText('{value0} (없음)', {value0: String(selected())})
                    },
                    value: `id:${selected()}`,
                  },
                ]
              : []),
          ]
          const value = () =>
            selected() === undefined ? 'auto' : selected() === null ? 'none' : `id:${selected()}`
          const handleChange = (value: string) =>
            update(axis.key, {
              parameterId:
                value === 'auto'
                  ? undefined
                  : value === 'none'
                    ? null
                    : value.slice(PARAMETER_PREFIX.length),
            })
          const inverted = () =>
            resolveTrackingInversion(
              resolveTrackingParameter(source().parameters(), axis.key, selected()),
              axis.key,
              binding()?.inverted,
            )
          const handleInvert = () => update(axis.key, {inverted: !inverted()})
          const handleBlend = (blend: 'add' | 'overwrite') => update(axis.key, {blend})
          return (
            <div class="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-2 py-1 text-[13px]">
              <span>{localizeMessage(axis.label)}</span>
              <SSelect
                label={uiText('{value0} 파라미터', {value0: String(localizeMessage(axis.label))})}
                value={value()}
                options={options()}
                onChange={handleChange}
              />
              <button
                type="button"
                class="wallpaper-file-button aria-pressed:bg-blue-50 aria-pressed:text-blue-800"
                aria-label={uiText('{value0} 방향 반전', {
                  value0: String(localizeMessage(axis.label)),
                })}
                aria-pressed={inverted()}
                onClick={handleInvert}
              >
                {inverted() ? uiText('반전됨') : uiText('반전')}
              </button>
              <div class="col-start-2 col-span-2">
                <SSelect
                  label={uiText('{value0} 적용 방식', {
                    value0: String(localizeMessage(axis.label)),
                  })}
                  value={binding()?.blend ?? 'overwrite'}
                  options={[
                    {
                      label: uiText('덮어쓰기'),
                      value: 'overwrite',
                    },
                    {
                      label: uiText('더하기'),
                      value: 'add',
                    },
                  ]}
                  onChange={handleBlend}
                />
              </div>
            </div>
          )
        }}
      </For>
    </Show>
  )
  return (
    <Show
      when={props.disclosure !== false}
      fallback={
        <section aria-label={uiText('입력과 파라미터 연결')} class="grid gap-2">
          <h3 class="m-0 text-[13px] font-medium text-stone-700">
            {uiText('입력과 파라미터 연결')}
          </h3>
          {fields}
        </section>
      }
    >
      <details class="wallpaper-disclosure-panel" onToggle={handleToggle}>
        <summary class="wallpaper-disclosure">{uiText('입력과 파라미터 연결')}</summary>
        <div class="wallpaper-disclosure-content">{fields}</div>
      </details>
    </Show>
  )
}
