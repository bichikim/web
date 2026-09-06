import {Tabs} from '@kobalte/core/tabs'
import {createSignal} from 'solid-js'
import {getPomoIconClass} from './icon-style'
import {PIconButton} from './PIconButton'
import {PModal} from './PModal'
import {useScreenWakeLock} from '../features/screen-wake-lock'
import {UserSettings} from './UserSettings'
import * as m from '@paraglide/message'
import {PCreditsSettings} from './PCreditsSettings'
import {PDialogueSettings} from './PDialogueSettings'
import {PFeedSettings} from './PFeedSettings'
import {PGuideSettings} from './PGuideSettings'
import {PScribbleCircleControl} from './scribble/CircleControl'
import {PSettingsTabList} from './settings/TabList'
import {type PSettingsProps} from './settings/general/shared'
import {PGeneralSettings} from './settings/general/General'

export const PSettings = (props: PSettingsProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const wakeLock = useScreenWakeLock()
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setIsOpen(true)
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()

  return (
    <>
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <PIconButton
          accessibleLabel={m.settings_open()}
          feedback={m.settings_feedback()}
          icon={getPomoIconClass('i-tabler-settings', props.sceneStyle)}
          onPress={handleOpen}
        />
      </PScribbleCircleControl>
      <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
        <PModal
          isOpen={isOpen()}
          navigation={<PSettingsTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="expanded"
          title={m.settings_title()}
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="general">
            <PGeneralSettings {...props} wakeLock={wakeLock} />
          </Tabs.Content>
          <PGuideSettings />
          <PCreditsSettings />
          <PFeedSettings />
          <PDialogueSettings onRequestClose={() => setIsOpen(false)} />
          <UserSettings />
        </PModal>
      </Tabs>
    </>
  )
}

export type {PSettingsProps} from './settings/general/shared'
