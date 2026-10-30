import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {PoffoTrackingBinding} from '@winter-love/wallpaper/settings/tracking'
import type {TrackingParameter} from '../features/tracking/types'
import {resolveLipSyncParameter} from '../features/lipsync/parameters'
import {SSelect} from './SSelect'

interface SPoffoLipSyncBindingProps {
  readonly label: string
  readonly shape: LipSyncShape
  readonly parameters: readonly TrackingParameter[]
  readonly value?: PoffoTrackingBinding
  readonly disabled?: boolean
  readonly onChange?: (binding: PoffoTrackingBinding) => void | Promise<void>
}
const PARAMETER_PREFIX = 'id:'
export const SPoffoLipSyncBinding = (props: SPoffoLipSyncBindingProps) => {
  const automatic = () => resolveLipSyncParameter(props.parameters, undefined, props.shape)
  const selected = () => props.value?.parameterId
  const selection = () =>
    selected() === undefined ? 'auto' : selected() === null ? 'none' : `id:${selected()}`
  const options = () => [
    {label: `자동 · ${automatic()?.name || automatic()?.id || '연결 없음'}`, value: 'auto'},
    {label: '사용 안 함', value: 'none'},
    ...props.parameters.map((parameter) => ({
      label: parameter.name || parameter.id,
      value: `id:${parameter.id}`,
    })),
    ...(typeof selected() === 'string' &&
    !props.parameters.some((parameter) => parameter.id === selected())
      ? [{label: `${selected()} (없음)`, value: `id:${selected()}`}]
      : []),
  ]
  const handleParameter = (selection: string) =>
    props.onChange?.({
      ...props.value,
      parameterId:
        selection === 'auto'
          ? undefined
          : selection === 'none'
            ? null
            : selection.slice(PARAMETER_PREFIX.length),
    })
  const handleInvert = () => props.onChange?.({...props.value, inverted: !props.value?.inverted})
  return (
    <div class="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2">
      <span>{props.label}</span>
      <SSelect
        label={`${props.label} 입모양 파라미터`}
        value={selection()}
        options={options()}
        disabled={props.disabled || props.onChange === undefined}
        onChange={handleParameter}
      />
      <button
        type="button"
        class="wallpaper-file-button aria-pressed:bg-blue-50 aria-pressed:text-blue-800"
        aria-label={`${props.label} 입모양 방향 반전`}
        aria-pressed={props.value?.inverted ?? false}
        disabled={props.disabled || props.onChange === undefined}
        onClick={handleInvert}
      >
        {props.value?.inverted ? '반전됨' : '반전'}
      </button>
    </div>
  )
}
