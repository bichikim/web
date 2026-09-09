import {Background} from './background/Background'
import {Tabs} from '@kobalte/core/tabs'
import type {ScreenWakeLockController} from '../../features/screen-wake-lock'
import {UserSettings} from '../UserSettings'
import {PCreditsSettings} from '../PCreditsSettings'
import {PDialogueSettings} from '../PDialogueSettings'
import {PFeedSettings} from '../PFeedSettings'
import {PGuideSettings} from '../PGuideSettings'
import {PGeneralSettings} from './general/General'
import type {PSettingsProps} from './general/shared'

interface PSettingsContentProps extends PSettingsProps {
  readonly wakeLock: ScreenWakeLockController
  readonly onRequestClose?: () => void
}

export const PSettingsContent = (props: PSettingsContentProps) => {
  return (
    <>
      <Tabs.Content value="general">
        <PGeneralSettings {...props} wakeLock={props.wakeLock} />
      </Tabs.Content>
      <Tabs.Content value="background">
        <Background {...props} />
      </Tabs.Content>
      <PGuideSettings />
      <PCreditsSettings />
      <PFeedSettings />
      <PDialogueSettings onRequestClose={props.onRequestClose} />
      <UserSettings />
    </>
  )
}
