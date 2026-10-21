import {createMemo, createSignal, For, Show} from 'solid-js'
import type {
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
  readonly source?: ParameterSource
  readonly disclosure?: boolean
  readonly assetId: string | null
  readonly load: (id: string) => Promise<string>
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
            {message()}
          </p>
        )}
      </Show>
      <For each={TRACKING_AXES}>
        {(axis) => {
          const binding = () => props.value?.[axis.key]
          const selected = () => binding()?.parameterId
          const automatic = () => resolveTrackingParameter(source().parameters(), axis.key)
          const automaticLabel = () => {
            const parameter = automatic()
            return parameter?.name || parameter?.id || '연결 없음'
          }
          const options = () => [
            {
              label: `자동 · ${automaticLabel()}`,
              value: 'auto',
            },
            {label: '사용 안 함', value: 'none'},
            ...source()
              .parameters()
              .map((parameter) => ({
                label: parameter.name || parameter.id,
                value: `id:${parameter.id}`,
              })),
            ...(typeof selected() === 'string' &&
            !source()
              .parameters()
              .some((parameter) => parameter.id === selected())
              ? [{label: `${selected()} (없음)`, value: `id:${selected()}`}]
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
          return (
            <div class="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-2 py-1 text-[13px]">
              <span>{axis.label}</span>
              <SSelect
                label={`${axis.label} 파라미터`}
                value={value()}
                options={options()}
                onChange={handleChange}
              />
              <button
                type="button"
                class="wallpaper-file-button aria-pressed:bg-blue-50 aria-pressed:text-blue-800"
                aria-label={`${axis.label} 방향 반전`}
                aria-pressed={inverted()}
                onClick={handleInvert}
              >
                {inverted() ? '반전됨' : '반전'}
              </button>
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
        <section aria-label="입력과 파라미터 연결" class="grid gap-2">
          <h3 class="m-0 text-[13px] font-medium text-stone-700">입력과 파라미터 연결</h3>
          {fields}
        </section>
      }
    >
      <details onToggle={handleToggle}>
        <summary class="wallpaper-disclosure">입력과 파라미터 연결</summary>
        {fields}
      </details>
    </Show>
  )
}
