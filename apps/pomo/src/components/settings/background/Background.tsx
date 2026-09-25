import {Match, Show, Switch, untrack} from 'solid-js'
import * as m from '@paraglide/message'
import {type BackgroundError, type BackgroundMode, useBackground} from 'src/features/background'
import {synchronizeDesktopBackground} from 'src/features/desktop-mode'
import {PRadioSwitch} from '../../p-radio-switch/PRadioSwitch'
import {PSettingsActionButton} from '../ActionButton'
import {CLASSES} from '../classes'
import type {PSettingsProps} from '../types'
import {Scene} from './Scene'
import {Style} from './Style'
import {Weather} from './Weather'
import {Frame} from './Frame'
import {Website} from './Website'

const isDesktopBuild = () => import.meta.env.VITE_POMO_IS_DESKTOP === 'true'

const getBackgroundModeOptions = () => [
  {label: m.background_character(), value: 'character' as const},
  {label: m.background_frame(), value: 'frame' as const},
  ...(isDesktopBuild() ? [{label: m.background_website(), value: 'website' as const}] : []),
]

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
  const handleModeChange = (mode: BackgroundMode) => {
    background
      .configure({mode})
      .then(() => synchronizeDesktopBackground())
      .catch(() => undefined)
  }
  return (
    <div class={CLASSES.settingsContent}>
      <PRadioSwitch
        label={m.settings_tab_background()}
        value={
          !isDesktopBuild() && background.preferences().mode === 'website'
            ? 'character'
            : background.preferences().mode
        }
        disabled={!background.ready()}
        options={getBackgroundModeOptions()}
        onChange={handleModeChange}
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
      <Switch fallback={<Frame background={background} />}>
        <Match
          when={
            background.preferences().mode === 'character' ||
            (!isDesktopBuild() && background.preferences().mode === 'website')
          }
        >
          <Scene {...props} />
          <Style {...props} />
          <Weather {...props} />
        </Match>
        <Match when={background.preferences().mode === 'frame'}>
          <Frame background={background} />
        </Match>
        <Match when={isDesktopBuild() && background.preferences().mode === 'website'}>
          <Website background={background} />
        </Match>
      </Switch>
    </div>
  )
}
