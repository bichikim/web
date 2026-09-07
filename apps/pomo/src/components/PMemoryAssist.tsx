import {PLoadingStatus} from './PLoadingStatus'
import {Tabs} from '@kobalte/core/tabs'
import {createSignal, ErrorBoundary, lazy, onMount, Suspense} from 'solid-js'

import * as m from '@paraglide/message'

import type {PSceneStyle} from '../features/focus-room-animation'
import type {WeatherState} from '../features/weather'
import {getPomoIconClass} from './icon-style'
import {GLASS_ICON_BUTTON} from './button-presets'
import {PButton} from './PButton'
import {PModal} from './PModal'
import {MEMORY_ASSIST_ICON} from './memory-assist/icon'
import {PMemoryAssistTabList} from './memory-assist/TabList'
import {PScribbleCircleControl} from './scribble/CircleControl'

export interface PMemoryAssistProps {
  readonly sceneStyle?: PSceneStyle
  readonly weatherState?: WeatherState
}

const PMemoryAssistContent = lazy(async () => {
  try {
    const module = await import('./memory-assist/Content')
    return {default: module.PMemoryAssistContent}
  } catch (error) {
    // Preload must settle so module failures reach the modal's error boundary.
    return {
      default: () => {
        throw error
      },
    }
  }
})

export const PMemoryAssist = (props: PMemoryAssistProps) => {
  onMount(() => PMemoryAssistContent.preload())
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('sentences')
  const [calendarRevision, setCalendarRevision] = createSignal(0)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const refreshCalendar = () => setCalendarRevision((revision) => revision + 1)
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    if (activeTab() === 'calendar') {
      refreshCalendar()
    }
    setIsOpen(true)
  }
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'calendar') {
      refreshCalendar()
    }
  }
  const handleCloseAutoFocus = () => triggerElement()?.focus()

  return (
    <>
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <PButton
          {...GLASS_ICON_BUTTON}
          pill
          accessibleLabel={m.memory_assist_open()}
          tooltip={m.memory_assist_open()}
          icon={getPomoIconClass(MEMORY_ASSIST_ICON, props.sceneStyle)}
          onPress={handleOpen}
        />
      </PScribbleCircleControl>
      <Tabs class="contents" value={activeTab()} onChange={handleTabChange}>
        <PModal
          isOpen={isOpen()}
          navigation={<PMemoryAssistTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="expanded"
          title={m.memory_assist_title()}
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
              <PMemoryAssistContent
                weatherState={props.weatherState}
                calendarRevision={calendarRevision()}
                onRefreshCalendar={refreshCalendar}
                onRequestClose={() => setIsOpen(false)}
              />
            </Suspense>
          </ErrorBoundary>
        </PModal>
      </Tabs>
    </>
  )
}
