import {useScreenWakeLock} from '../../features/screen-wake-lock'
import {openDesktopDialog} from '../../features/desktop-mode/dialogs'
import {Tabs} from '@kobalte/core/tabs'
import {createSignal, onMount, Show} from 'solid-js'
import {getPomoIconClass} from '../icon-style'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'
import * as m from '@paraglide/message'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PSettingsTabList} from '../settings/TabList'
import type {PSettingsProps} from '../settings/types'
import {preloadSettingsContent, PSettingsBody} from './PSettingsBody'
import {PSettingsWindow} from './PSettingsWindow'

interface PSettingsPresentationProps {
  readonly onRequestClose?: () => void
  readonly presentation?: 'trigger' | 'window'
}

export const PSettings = (props: PSettingsProps & PSettingsPresentationProps) => {
  const wakeLock = useScreenWakeLock()
  onMount(preloadSettingsContent)
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)

    if (props.desktopSurface) {
      openDesktopDialog('settings').catch((error: unknown) => {
        console.error('Failed to open the desktop settings dialog.', error)
      })
      return
    }

    setIsOpen(true)
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()

  return (
    <>
      <Show
        when={props.presentation === 'window'}
        fallback={
          <>
            <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
              <PButton
                {...GLASS_ICON_BUTTON}
                pill
                accessibleLabel={m.settings_open()}
                tooltip={m.settings_open()}
                icon={getPomoIconClass('i-tabler-settings', props.sceneStyle)}
                iconClass="size-6! text-highlight"
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
                <PSettingsBody {...props} wakeLock={wakeLock} />
              </PModal>
            </Tabs>
          </>
        }
      >
        <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
          <PSettingsWindow onClose={props.onRequestClose}>
            <PSettingsBody {...props} wakeLock={wakeLock} />
          </PSettingsWindow>
        </Tabs>
      </Show>
    </>
  )
}

export type {PSettingsProps} from '../settings/types'
