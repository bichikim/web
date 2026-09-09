import {Show, untrack} from 'solid-js'
import * as m from '@paraglide/message'
import {type BackgroundError, useBackground} from 'src/features/background'
import {PRadioSwitch} from '../../PRadioSwitch'
import {PSettingsActionButton} from '../ActionButton'
import {CLASSES, type PSettingsProps} from '../general/shared'
import {Scene} from './Scene'
import {Style} from './Style'
import {Weather} from './Weather'
import {Frame} from './Frame'

const getErrorMessage = (error: BackgroundError | null) => {
  switch (error) {
    case 'file':
      return m.background_file_error()
    case 'size':
      return m.background_size_error()
    case 'picker':
      return m.background_picker_error()
    case 'unsupported':
      return m.background_unsupported_error()
    case 'load':
    case 'save':
      return m.background_storage_error()
    case null:
      return ''
  }
}

export const Background = (props: PSettingsProps) => {
  const background = untrack(() => props.background) ?? useBackground()
  return (
    <div class={CLASSES.settingsContent}>
      <PRadioSwitch
        label={m.settings_tab_background()}
        value={background.preferences().mode}
        disabled={!background.ready()}
        options={[
          {label: m.background_character(), value: 'character'},
          {label: m.background_frame(), value: 'frame'},
        ]}
        onChange={(mode) => {
          background.configure({mode})
        }}
      />
      <Show when={background.error()}>
        <div class="grid gap-2" role="alert">
          <p class="m-0 text-sm text-danger">{getErrorMessage(background.error())}</p>
          <Show when={background.error() === 'load' || background.error() === 'save'}>
            <PSettingsActionButton
              onPress={() => {
                background.retry()
              }}
              disabled={background.busy()}
            >
              {m.background_retry()}
            </PSettingsActionButton>
          </Show>
        </div>
      </Show>
      <Show
        when={background.preferences().mode === 'character'}
        fallback={<Frame background={background} />}
      >
        <Scene {...props} />
        <Style {...props} />
        <Weather {...props} />
      </Show>
    </div>
  )
}
