import {type PoffoTracking, poffoTrackingSchema} from '@winter-love/wallpaper/settings/tracking'
import {SSelect} from './SSelect'

interface SPoffoTrackingSettingsProps {
  readonly value?: PoffoTracking
  readonly label?: string
  readonly onChange?: (value: PoffoTracking) => void | Promise<void>
}
const OPTIONS = [
  {label: '없음', value: 'off'},
  {label: '마우스 커서', value: 'cursor'},
  {label: '카메라', value: 'camera'},
]
export const SPoffoTrackingSettings = (props: SPoffoTrackingSettingsProps) => {
  const handleChange = (value: string) => props.onChange?.(poffoTrackingSchema.parse(value))
  return (
    <SSelect
      label={props.label ?? '트래킹 입력'}
      options={OPTIONS}
      value={props.value ?? 'off'}
      disabled={props.onChange === undefined}
      onChange={handleChange}
    />
  )
}
