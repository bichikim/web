import {cx} from 'class-variance-authority'
import {JSX, splitProps} from 'solid-js'
import {SPlayerButton} from './SPlayerButton'
import {SSettingItem} from './SSettingItem'
import {HUNDRED} from '@winter-love/utils'

export interface SettingData {
  keepPlayList?: boolean
  pianoSize?: number
}

export interface SSettingProps extends JSX.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  onSettingDataChange?: (data: SettingData) => void
  pianoMinScale?: number
  settingData?: SettingData
}

const DEFAULT_MIN_SCALE = 20

export const SSetting = (props: SSettingProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'onClose',
    'settingData',
    'onSettingDataChange',
    'pianoMinScale',
  ])

  const handleClose = () => {
    innerProps.onClose?.()
  }

  const handleSettingData = (data: SettingData) => {
    innerProps.onSettingDataChange?.(data)
  }

  const handleSettingPianoSize = (value: number) => {
    handleSettingData({...innerProps.settingData, pianoSize: value})
  }

  const handleSettingKeepPlayList = (value: boolean) => {
    handleSettingData({...innerProps.settingData, keepPlayList: value})
  }

  return (
    <div
      {...restProps}
      class={cx(
        'bg-white rd-2 p-2 box-border flex flex-col justify-end',
        innerProps.class,
      )}
    >
      <SSettingItem
        label="Piano Size"
        type="slider"
        value={innerProps.settingData?.pianoSize ?? HUNDRED}
        min={
          innerProps.pianoMinScale
            ? innerProps.pianoMinScale * HUNDRED
            : DEFAULT_MIN_SCALE
        }
        max={100}
        onValueChange={handleSettingPianoSize}
      />
      <SSettingItem
        label="Keep Play List"
        type="switch"
        value={innerProps.settingData?.keepPlayList}
        onValueChange={handleSettingKeepPlayList}
      />
      <div class="flex justify-end w-full">
        <SPlayerButton class="min-w-11 min-h-9 bg-gray-100" onClick={handleClose}>
          <span class="i-hugeicons:cancel-01 text-8 inline-block" />
        </SPlayerButton>
      </div>
    </div>
  )
}
