import {text as uiText} from '../features/localization'
import {type PoffoTracking, poffoTrackingSchema} from '@winter-love/wallpaper/settings/tracking'
import {SSelect} from './SSelect'

interface SPoffoTrackingSettingsProps {
  readonly value?: PoffoTracking
  readonly label?: string
  readonly onChange?: (value: PoffoTracking) => void | Promise<void>
}
const OPTIONS = [
  {
    get label() {
      return uiText('없음')
    },
    value: 'off',
  },
  {
    get label() {
      return uiText('마우스 커서')
    },
    value: 'cursor',
  },
  {
    get label() {
      return uiText('카메라 속 얼굴 따라보기')
    },
    value: 'camera',
  },
  {
    get label() {
      return uiText('카메라 머리·눈·몸 따라 하기')
    },
    value: 'camera-pose',
  },
]
export const SPoffoTrackingSettings = (props: SPoffoTrackingSettingsProps) => {
  const handleChange = (value: string) => props.onChange?.(poffoTrackingSchema.parse(value))
  return (
    <SSelect
      label={props.label ?? uiText('트래킹 입력')}
      options={OPTIONS}
      value={props.value ?? 'off'}
      disabled={props.onChange === undefined}
      onChange={handleChange}
    />
  )
}
