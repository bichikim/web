import {Background} from './background/Background'
import {Tabs} from '@kobalte/core/tabs'
import type {ScreenWakeLockController} from '../../features/screen-wake-lock'
import {UserSettings} from '../user-settings/UserSettings'
import {PCreditsSettings} from '../p-credits-settings/PCreditsSettings'
import {PDialogueSettings} from '../p-dialogue-settings/PDialogueSettings'
import {PFeedSettings} from '../p-feed-settings/PFeedSettings'
import {PGuideSettings} from '../p-guide-settings/PGuideSettings'
import {PGeneralSettings} from './general/General'
import type {PSettingsProps} from './types'
import {App} from './app/App'

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
      <Tabs.Content value="app">
        <App {...props} />
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
