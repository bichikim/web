import * as m from '@paraglide/message'
import {Show} from 'solid-js'

import {PDesktopModeControl} from '../../p-desktop-mode-control/PDesktopModeControl'
import {CLASSES} from '../classes'
import type {PSettingsProps} from '../types'

export const App = (props: PSettingsProps) => (
  <Show when={import.meta.env.VITE_POMO_IS_DESKTOP === 'true'}>
    <section aria-label={m.desktop_mode_label()} class={CLASSES.settingsContent}>
      <PDesktopModeControl
        error={props.desktopModeError}
        isChanging={props.isDesktopModeChanging}
        mode={props.desktopMode ?? 'normal'}
        onModeChange={(mode) => props.onDesktopModeChange?.(mode) ?? Promise.resolve()}
        sceneStyle={props.sceneStyle}
      />
    </section>
  </Show>
)
