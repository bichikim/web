import {createMemo, Show} from 'solid-js'
import {
  DEFAULT_MICROPHONE_THRESHOLD,
  type PoffoLipSync,
} from '@winter-love/wallpaper/settings/lipsync'
import {localizeMessage, text as uiText} from '../features/localization'
import {useMicrophoneSettings} from '../features/lipsync/use-microphone-settings'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

interface SPoffoMicrophoneSettingsProps {
  /** Existing widget whose capture is observed; omission leaves live level unavailable. */
  readonly widgetId?: string
  /** Saved input preferences; omission uses system default and the standard noise threshold. */
  readonly value?: PoffoLipSync['microphone']
  /** Persists input preferences; omission displays read-only controls. */
  readonly onChange?: (value: NonNullable<PoffoLipSync['microphone']>) => void | Promise<void>
}
const PERCENT = 100

export const SPoffoMicrophoneSettings = (props: SPoffoMicrophoneSettingsProps) => {
  const microphone = useMicrophoneSettings({enabled: () => true, widgetId: () => props.widgetId})
  const deviceId = () => props.value?.deviceId ?? ''
  const options = createMemo(() => [
    {label: uiText('시스템 기본'), value: ''},
    ...microphone.devices().map((device, index) => ({
      label: device.label || uiText('마이크 {value0}', {value0: index + 1}),
      value: device.id,
    })),
    ...(deviceId() !== '' && !microphone.devices().some((device) => device.id === deviceId())
      ? [{label: uiText('선택한 마이크 · 연결 끊김'), value: deviceId()}]
      : []),
  ])
  const handleDevice = (value: string) => props.onChange?.({...props.value, deviceId: value})
  const handleThreshold = (value: number) =>
    props.onChange?.({...props.value, threshold: value / PERCENT})
  const level = () => Math.round((microphone.state()?.level ?? 0) * PERCENT)
  const error = () => microphone.state()?.error ?? microphone.error()
  return (
    <section aria-label={uiText('마이크 립싱크 설정')} class="grid gap-3">
      <div class="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
        <span class="text-stone-600">{uiText('마이크')}</span>
        <SSelect
          label={uiText('립싱크 마이크')}
          value={deviceId()}
          options={options()}
          disabled={props.onChange === undefined}
          onChange={handleDevice}
        />
      </div>
      <div class="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
        <span class="text-stone-600">{uiText('입력 레벨')}</span>
        <div
          role="meter"
          aria-label={uiText('마이크 입력 레벨')}
          aria-valuemin={0}
          aria-valuemax={PERCENT}
          aria-valuenow={level()}
          class="h-2 overflow-hidden rounded bg-stone-200"
        >
          <div
            class="h-full bg-emerald-700 [width:var(--microphone-level)]"
            style={{'--microphone-level': `${level()}%`}}
          />
        </div>
      </div>
      <div class="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
        <span class="text-stone-600">{uiText('작은 소리 무시')}</span>
        <div class="flex items-center gap-2">
          <SNumberInput
            label={uiText('작은 소리 무시')}
            value={(props.value?.threshold ?? DEFAULT_MICROPHONE_THRESHOLD) * PERCENT}
            min={0}
            max={PERCENT}
            step={1}
            disabled={props.onChange === undefined}
            onChange={handleThreshold}
          />
          <span class="text-xs text-stone-500">%</span>
        </div>
      </div>
      <Show when={microphone.state()?.phase === 'starting'}>
        <span role="status" class="text-xs text-stone-500">
          {uiText('마이크 연결 중')}
        </span>
      </Show>
      <Show when={error()}>
        {(message) => (
          <div class="flex items-center gap-2">
            <p role="alert" class="m-0 text-xs text-red-700">
              {localizeMessage(message() ?? '')}
            </p>
            <button type="button" class="wallpaper-button" onClick={microphone.retry}>
              {uiText('다시 연결')}
            </button>
          </div>
        )}
      </Show>
    </section>
  )
}
