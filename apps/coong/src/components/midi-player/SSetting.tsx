import {cx} from 'class-variance-authority'
import {Accessor, createContext, JSX, splitProps} from 'solid-js'
import {getRegistrations} from 'src/utils/service-worker'
import {SPlayerButton} from './SPlayerButton'
import {SSettingItem} from './SSettingItem'
import {HUNDRED} from '@winter-love/utils'

export interface SettingData {
  keepPlayList?: boolean
  pianoSize?: number
  showKeyName?: boolean
}

export const SettingContext = createContext<Accessor<SettingData>>(() => ({
  keepPlayList: true,
  pianoSize: 100,
  showKeyName: false,
}))

export interface SSettingProps extends JSX.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  onSettingDataChange?: (data: SettingData) => void
  pianoMinScale?: number
  settingData?: SettingData
}

const unregisterServiceWorker = async () => {
  const registrations = await getRegistrations()

  if (registrations.length > 0) {
    console.info('unregister service worker')
  }

  return Promise.all(registrations.map((registration) => registration.unregister()))
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

  const handleSettingShowKeyName = (value: boolean) => {
    handleSettingData({...innerProps.settingData, showKeyName: value})
  }

  return (
    <div
      {...restProps}
      class={cx(
        'flex flex-col gap-2 bg-white rd-2 p-2 box-border flex flex-col justify-end',
        innerProps.class,
      )}
    >
      <SSettingItem
        label="Show key name"
        type="switch"
        value={innerProps.settingData?.showKeyName}
        onValueChange={handleSettingShowKeyName}
      />
      <SSettingItem label="Reset PWA" type="button" onClick={unregisterServiceWorker} />
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
      <div class="flex justify-end w-full gap-2">
        <span class="text-5 md:text-7 text-gray-500 flex-grow-1 pt-3 leading-6">
          Love makes the world go round.
        </span>
        <SPlayerButton class="min-w-11 min-h-9 bg-gray-100" onClick={handleClose}>
          <span class="i-tabler:x text-8 inline-block" />
        </SPlayerButton>
      </div>
    </div>
  )
}
