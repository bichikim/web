import {useScreenWakeLock} from '../../features/screen-wake-lock'
import {openDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {Tabs} from '@kobalte/core/tabs'
import {createSignal, ErrorBoundary, lazy, onMount, Show, Suspense} from 'solid-js'
import {getPomoIconClass} from '../icon-style'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'
import {DesktopDialogFrame} from '../desktop-dialog/Frame'
import * as m from '@paraglide/message'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {PSettingsTabList} from '../settings/TabList'
import type {PSettingsProps} from '../settings/types'

const PSettingsContent = lazy(async () => {
  try {
    const module = await import('../settings/Content')
    return {default: module.PSettingsContent}
  } catch (error) {
    // Preload must settle so module failures reach the modal's error boundary.
    return {
      default: () => {
        throw error
      },
    }
  }
})

interface PSettingsPresentationProps {
  readonly onRequestClose?: () => void
  readonly presentation?: 'trigger' | 'window'
}

export const PSettings = (props: PSettingsProps & PSettingsPresentationProps) => {
  const wakeLock = useScreenWakeLock()
  onMount(() => PSettingsContent.preload())
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
  const settingsContent = (onRequestClose: () => void) => (
    <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
      <Suspense
        fallback={
          <div role="status">
            <PLoadingStatus message={m.modal_content_loading()} />
          </div>
        }
      >
        <PSettingsContent {...props} onRequestClose={onRequestClose} wakeLock={wakeLock} />
      </Suspense>
    </ErrorBoundary>
  )

  const dialogContent = () => {
    if (props.presentation !== 'window') {
      return null
    }

    return (
      <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
        <DesktopDialogFrame onClose={() => props.onRequestClose?.()} title={m.settings_title()}>
          <div class="-mx-5 -mt-5 mb-5 h-14 border-b border-solid border-border">
            <PSettingsTabList />
          </div>
          {settingsContent(() => props.onRequestClose?.())}
        </DesktopDialogFrame>
      </Tabs>
    )
  }

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
                {settingsContent(() => setIsOpen(false))}
              </PModal>
            </Tabs>
          </>
        }
      >
        {dialogContent()}
      </Show>
    </>
  )
}

export type {PSettingsProps} from '../settings/types'
