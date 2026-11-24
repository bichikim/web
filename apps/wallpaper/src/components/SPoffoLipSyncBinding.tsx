import {interfaceLanguage, text as uiText} from '../features/localization'
import {parameterName} from '../features/builtin-assets/parameter-name'
import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'
import type {PoffoTrackingBinding} from '@winter-love/wallpaper/settings/tracking'
import type {TrackingParameter} from '../features/tracking/types'
import {resolveLipSyncParameter} from '../features/lipsync/parameters'
import {resolveMouthPair} from '../features/lipsync/mouth-pair'
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
  const automaticLabel = () => {
    const parameter = automatic()
    return parameter === undefined
      ? resolveMouthPair(props.parameters) === undefined
        ? uiText('연결 없음')
        : uiText('벌림 + 형태')
      : parameterName(parameter, interfaceLanguage.language())
  }
  const selected = () => props.value?.parameterId
  const selection = () =>
    selected() === undefined ? 'auto' : selected() === null ? 'none' : `id:${selected()}`
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
    ...props.parameters.map((parameter) => ({
      label: parameterName(parameter, interfaceLanguage.language()),
      value: `id:${parameter.id}`,
    })),
    ...(typeof selected() === 'string' &&
    !props.parameters.some((parameter) => parameter.id === selected())
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
    <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
      <span class="flex min-w-0 items-center justify-between gap-1 text-stone-600">
        <span>{props.label}</span>
        <button
          type="button"
          class="wallpaper-chain-action grid shrink-0 place-items-center p-0
          aria-pressed:bg-blue-50 aria-pressed:text-blue-800"
          aria-label={uiText('{value0} 입모양 방향 반전', {value0: String(props.label)})}
          title={props.value?.inverted ? uiText('방향 반전 해제') : uiText('방향 반전')}
          aria-pressed={props.value?.inverted ?? false}
          disabled={props.disabled || props.onChange === undefined}
          onClick={handleInvert}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 fill-none stroke-current [stroke-width:1.75]
            [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <path
              d={
                props.value?.inverted
                  ? 'm5 12 4 4L19 6'
                  : 'M7 4v16m-3-3 3 3 3-3M17 20V4m-3 3 3-3 3 3'
              }
            />
          </svg>
        </button>
      </span>
      <SSelect
        label={uiText('{value0} 입모양 파라미터', {value0: String(props.label)})}
        value={selection()}
        options={options()}
        disabled={props.disabled || props.onChange === undefined}
        onChange={handleParameter}
      />
    </div>
  )
}
