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
  settingData?: SettingData
}

export const SSetting = (props: SSettingProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'class',
    'onClose',
    'settingData',
    'onSettingDataChange',
  ])

  const handleClose = () => {
    innerProps.onClose?.()
  }

  const handleSettingData = (data: SettingData) => {
    innerProps.onSettingDataChange?.(data)
  }

  const handleSettingPianoSize = (value: number) => {
    console.log('value', value)
    handleSettingData({...innerProps.settingData, pianoSize: value})
  }

  const handleSettingKeepPlayList = (value: boolean) => {
    console.log('value', value)
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
        min={20}
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
        <SPlayerButton
          class="min-w-11 min-h-9 bg-gray-100"
          onClick={handleClose}
          onTouchEnd={handleClose}
        >
          <span class="i-hugeicons:cancel-01 text-8 inline-block" />
        </SPlayerButton>
      </div>
    </div>
  )
}
