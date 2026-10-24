import * as m from '@paraglide/message'
import {Show} from 'solid-js'

import type {DesktopMode} from '../../features/desktop-mode'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {PRadioSwitch, type PRadioSwitchOption} from '../p-radio-switch/PRadioSwitch'

export interface PDesktopModeControlProps {
  readonly error?: string | null
  readonly isChanging?: boolean
  readonly mode: DesktopMode
  readonly onModeChange: (mode: DesktopMode) => Promise<void>
  readonly sceneStyle?: PSceneStyle
}

const getModeOptions = (): ReadonlyArray<PRadioSwitchOption<DesktopMode>> => [
  {icon: 'i-tabler-app-window', label: m.desktop_mode_normal(), value: 'normal'},
  {icon: 'i-tabler-picture-in-picture', label: m.desktop_mode_widget(), value: 'widget'},
  {icon: 'i-tabler-wallpaper', label: m.desktop_mode_desktop(), value: 'desktop'},
  {
    icon: 'i-tabler-hand-click',
    label: m.desktop_mode_interactive_desktop(),
    value: 'interactiveDesktop',
  },
]

export const PDesktopModeControl = (props: PDesktopModeControlProps) => {
  const requestMode = (mode: DesktopMode) => {
    props.onModeChange(mode).catch(() => undefined)
  }

  return (
    <Show when={import.meta.env.VITE_POMO_IS_DESKTOP === 'true'}>
      <PRadioSwitch
        disabled={props.isChanging}
        label={m.desktop_mode_label()}
        onChange={requestMode}
        options={getModeOptions()}
        sceneStyle={props.sceneStyle}
        value={props.mode}
      />
      <Show when={props.error}>
        {(message) => (
          <p class="m-0 text-xs text-danger" role="alert">
            {m.desktop_mode_error({message: message()})}
          </p>
        )}
      </Show>
    </Show>
  )
}
