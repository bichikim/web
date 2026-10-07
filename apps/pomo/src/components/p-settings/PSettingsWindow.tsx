import * as m from '@paraglide/message'
import type {JSX} from 'solid-js'
import {DesktopDialogFrame} from '../desktop-dialog/Frame'
import {PSettingsTabList} from '../settings/TabList'

export interface PSettingsWindowProps {
  readonly children?: JSX.Element
  readonly onClose?: () => void
}

export const PSettingsWindow = (props: PSettingsWindowProps) => (
  <DesktopDialogFrame onClose={() => props.onClose?.()} title={m.settings_title()}>
    <div class="-mx-5 -mt-5 mb-5 h-14 border-b border-solid border-border">
      <PSettingsTabList />
    </div>
    {props.children}
  </DesktopDialogFrame>
)
