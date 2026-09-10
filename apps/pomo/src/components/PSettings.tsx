import {useScreenWakeLock} from '../features/screen-wake-lock'
import {PLoadingStatus} from './PLoadingStatus'
import {Tabs} from '@kobalte/core/tabs'
import {createSignal, ErrorBoundary, lazy, onMount, Suspense} from 'solid-js'
import {getPomoIconClass} from './icon-style'
import {GLASS_ICON_BUTTON} from './button-presets'
import {PButton} from './PButton'
import {PModal} from './PModal'
import * as m from '@paraglide/message'
import {PScribbleCircleControl} from './scribble/CircleControl'
import {PSettingsTabList} from './settings/TabList'
import {type PSettingsProps} from './settings/general/shared'

const PSettingsContent = lazy(async () => {
  try {
    const module = await import('./settings/Content')
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

export const PSettings = (props: PSettingsProps) => {
  const wakeLock = useScreenWakeLock()
  onMount(() => PSettingsContent.preload())
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setIsOpen(true)
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()

  return (
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
          closeOnEscape={false}
          isOpen={isOpen()}
          navigation={<PSettingsTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="expanded"
          title={m.settings_title()}
          titleVisibility="visually-hidden"
        >
          <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
            <Suspense
              fallback={
                <div role="status">
                  <PLoadingStatus message={m.modal_content_loading()} />
                </div>
              }
            >
              <PSettingsContent
                {...props}
                wakeLock={wakeLock}
                onRequestClose={() => setIsOpen(false)}
              />
            </Suspense>
          </ErrorBoundary>
        </PModal>
      </Tabs>
    </>
  )
}

export type {PSettingsProps} from './settings/general/shared'
