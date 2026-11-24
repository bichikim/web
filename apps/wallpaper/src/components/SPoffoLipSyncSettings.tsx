import {localizeMessage, text as uiText} from '../features/localization'

import {createMemo, For, Show} from 'solid-js'
import {
  DEFAULT_POFFO_LIPSYNC,
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
import {SPoffoMicrophoneSettings} from './SPoffoMicrophoneSettings'

interface SPoffoLipSyncSettingsProps {
  /** Existing widget for microphone level and retry; omission keeps input configuration available. */
  readonly widgetId?: string
  readonly source?: ParameterSource
  readonly assetId: string | null
  readonly load: (id: string) => Promise<string | Blob>
  readonly value?: PoffoLipSync
  readonly onChange?: (value: PoffoLipSync) => void | Promise<void>
}
const SHAPES: readonly {readonly value: LipSyncShape; readonly label: string}[] = [
  {
    get label() {
      return uiText('아')
    },
    value: 'a',
  },
  {
    get label() {
      return uiText('이')
    },
    value: 'i',
  },
  {
    get label() {
      return uiText('우')
    },
    value: 'u',
  },
  {
    get label() {
      return uiText('에')
    },
    value: 'e',
  },
  {
    get label() {
      return uiText('오')
    },
    value: 'o',
  },
  {
    get label() {
      return uiText('닫힘')
    },
    value: 'closed',
  },
]
export const SPoffoLipSyncSettings = (props: SPoffoLipSyncSettingsProps) => {
  const value = (): PoffoLipSync => props.value ?? DEFAULT_POFFO_LIPSYNC
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
  const handleMicrophone = (microphone: NonNullable<PoffoLipSync['microphone']>) =>
    update({microphone})
  return (
    <section aria-label={uiText('립싱크 연결')} class="grid gap-2 text-[13px]">
      <h3 class="m-0 font-semibold text-stone-800">{uiText('립싱크')}</h3>
      <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
        <span class="text-stone-600">{uiText('입력')}</span>
        <SSelect
          label={uiText('립싱크 입력')}
          value={value().source}
          options={[
            {
              label: uiText('끄기'),
              value: 'off',
            },
            {
              label: uiText('읽어주는 음성'),
              value: 'voice',
            },
            {
              label: uiText('말풍선 글'),
              value: 'speech',
            },
            {label: uiText('마이크'), value: 'microphone'},
          ]}
          disabled={props.onChange === undefined}
          onChange={handleSource}
        />
      </div>
      <Show when={value().source === 'microphone'}>
        <SPoffoMicrophoneSettings
          widgetId={props.widgetId}
          value={value().microphone}
          onChange={props.onChange === undefined ? undefined : handleMicrophone}
        />
      </Show>
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
        <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
          <span class="whitespace-nowrap text-stone-600">{uiText('움직임 배율')}</span>
          <div class="flex min-w-0 items-center gap-2">
            <SNumberInput
              label={uiText('립싱크 움직임 배율')}
              value={value().gain ?? DEFAULT_POFFO_LIPSYNC.gain}
              min={0}
              max={MAXIMUM_LIPSYNC_GAIN}
              step={0.1}
              disabled={props.onChange === undefined}
              onChange={handleGain}
            />
            <span class="text-xs text-stone-500">×</span>
          </div>
        </div>
        <Show when={parameters().error()}>
          {(message) => (
            <p role="alert" class="m-0 text-xs text-red-700">
              {localizeMessage(message() ?? '')}
            </p>
          )}
        </Show>
      </Show>
    </section>
  )
}
