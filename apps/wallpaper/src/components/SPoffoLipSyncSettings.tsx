import {createMemo, Show} from 'solid-js'
import {
  type LipSyncSource,
  MAXIMUM_LIPSYNC_GAIN,
  type PoffoLipSync,
} from '@winter-love/wallpaper/settings/lipsync'
import {type ParameterSource, useParameters} from '../features/tracking/use-parameters'
import {resolveLipSyncParameter} from '../features/lipsync/parameters'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoLipSyncSettingsProps {
  readonly source?: ParameterSource
  readonly assetId: string | null
  readonly load: (id: string) => Promise<string>
  readonly value?: PoffoLipSync
  readonly onChange?: (value: PoffoLipSync) => void | Promise<void>
}
const PARAMETER_PREFIX = 'id:'
export const SPoffoLipSyncSettings = (props: SPoffoLipSyncSettingsProps) => {
  const value = () => props.value ?? {source: 'off' as const}
  const own = useParameters({
    assetId: () => props.assetId,
    enabled: () => props.source === undefined && value().source !== 'off',
    load: (id) => props.load(id),
  })
  const parameters = createMemo(() => props.source ?? own)
  const update = (patch: Partial<PoffoLipSync>) => props.onChange?.({...value(), ...patch})
  const automatic = () => resolveLipSyncParameter(parameters().parameters())
  const selected = () => value().parameterId
  const selection = () =>
    selected() === undefined ? 'auto' : selected() === null ? 'none' : `id:${selected()}`
  const options = () => [
    {label: `자동 · ${automatic()?.name || automatic()?.id || '연결 없음'}`, value: 'auto'},
    {label: '사용 안 함', value: 'none'},
    ...parameters()
      .parameters()
      .map((parameter) => ({label: parameter.name || parameter.id, value: `id:${parameter.id}`})),
    ...(typeof selected() === 'string' &&
    !parameters()
      .parameters()
      .some((parameter) => parameter.id === selected())
      ? [{label: `${selected()} (없음)`, value: `id:${selected()}`}]
      : []),
  ]
  const handleSource = (source: LipSyncSource) => update({source})
  const handleParameter = (selected: string) =>
    update({
      parameterId:
        selected === 'auto'
          ? undefined
          : selected === 'none'
            ? null
            : selected.slice(PARAMETER_PREFIX.length),
    })
  const handleInvert = () => update({inverted: !value().inverted})
  const handleGain = (gain: number) => update({gain})
  return (
    <section
      aria-label="립싱크 연결"
      class="grid gap-2 border-0 border-t border-solid border-stone-200 pt-3 text-[13px]"
    >
      <h3 class="m-0 font-medium text-stone-700">립싱크</h3>
      <div class="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
        <span>입력</span>
        <SSelect
          label="립싱크 입력"
          value={value().source}
          options={[
            {label: '끄기', value: 'off'},
            {label: '음성', value: 'voice'},
            {label: '말풍선', value: 'speech'},
          ]}
          disabled={props.onChange === undefined}
          onChange={handleSource}
        />
      </div>
      <Show when={value().source !== 'off'}>
        <div class="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-2">
          <span>입 열림</span>
          <SSelect
            label="립싱크 파라미터"
            value={selection()}
            options={options()}
            disabled={parameters().loading() || props.onChange === undefined}
            onChange={handleParameter}
          />
          <button
            type="button"
            class="wallpaper-file-button aria-pressed:bg-blue-50 aria-pressed:text-blue-800"
            aria-label="립싱크 방향 반전"
            aria-pressed={value().inverted ?? false}
            disabled={props.onChange === undefined}
            onClick={handleInvert}
          >
            {value().inverted ? '반전됨' : '반전'}
          </button>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span>움직임 배율</span>
          <div class="flex items-center gap-2">
            <SNumberInput
              label="립싱크 움직임 배율"
              value={value().gain ?? 1}
              min={0}
              max={MAXIMUM_LIPSYNC_GAIN}
              step={0.1}
              disabled={props.onChange === undefined}
              onChange={handleGain}
            />
            <span>×</span>
          </div>
        </div>
        <Show when={parameters().error()}>
          {(message) => (
            <p role="alert" class="m-0 text-xs text-red-700">
              {message()}
            </p>
          )}
        </Show>
      </Show>
    </section>
  )
}
