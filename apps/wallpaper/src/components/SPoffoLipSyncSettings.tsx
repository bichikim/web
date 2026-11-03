import {createMemo, For, Show} from 'solid-js'
import {
  type LipSyncShape,
  type LipSyncSource,
  MAXIMUM_LIPSYNC_GAIN,
  type PoffoLipSync,
} from '@winter-love/wallpaper/settings/lipsync'
import {type ParameterSource, useParameters} from '../features/tracking/use-parameters'
import type {PoffoTrackingBinding} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoLipSyncBinding} from './SPoffoLipSyncBinding'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoLipSyncSettingsProps {
  readonly source?: ParameterSource
  readonly assetId: string | null
  readonly load: (id: string) => Promise<string | Blob>
  readonly value?: PoffoLipSync
  readonly onChange?: (value: PoffoLipSync) => void | Promise<void>
}
const SHAPES: readonly {readonly value: LipSyncShape; readonly label: string}[] = [
  {label: '아', value: 'a'},
  {label: '이', value: 'i'},
  {label: '우', value: 'u'},
  {label: '에', value: 'e'},
  {label: '오', value: 'o'},
  {label: '닫힘', value: 'closed'},
]
export const SPoffoLipSyncSettings = (props: SPoffoLipSyncSettingsProps) => {
  const value = () => props.value ?? {source: 'off' as const}
  const own = useParameters({
    assetId: () => props.assetId,
    enabled: () => props.source === undefined && value().source !== 'off',
    load: (id) => props.load(id),
  })
  const parameters = createMemo(() => props.source ?? own)
  const update = (patch: Partial<PoffoLipSync>) => props.onChange?.({...value(), ...patch})
  const handleSource = (source: LipSyncSource) => update({source})
  const handleBinding = (shape: LipSyncShape, binding: PoffoTrackingBinding) =>
    update({shapes: {...value().shapes, [shape]: binding}})
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
        <For each={SHAPES}>
          {(shape) => (
            <SPoffoLipSyncBinding
              label={shape.label}
              shape={shape.value}
              parameters={parameters().parameters()}
              value={value().shapes?.[shape.value]}
              disabled={parameters().loading() || props.onChange === undefined}
              onChange={(binding) => handleBinding(shape.value, binding)}
            />
          )}
        </For>
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
