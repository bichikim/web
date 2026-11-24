import icon from '../../src-tauri/icons/128x128.png'
import {text as uiText} from '../features/localization'

interface SSettingsLoadingProps {
  readonly fill?: boolean
}

export const SSettingsLoading = (props: SSettingsLoadingProps) => (
  <div
    role="status"
    aria-label={uiText('설정 불러오는 중')}
    class="grid place-items-center bg-white"
    classList={{'h-dvh': props.fill === true, 'min-h-36': props.fill !== true}}
  >
    <span
      aria-hidden="true"
      class="relative grid h-16 w-16 place-items-center rounded-full bg-blue-50/60"
    >
      <span
        class="absolute inset-0 rounded-full border-2 border-solid border-blue-100
          border-r-blue-300 border-t-blue-600 motion-safe:animate-spin"
      />
      <img src={icon} alt="" class="h-9 w-9" />
    </span>
  </div>
)
