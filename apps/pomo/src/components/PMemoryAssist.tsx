import {Tabs} from '@kobalte/core/tabs'
import {createSignal} from 'solid-js'

import * as m from '@paraglide/message'

import {clearCalendarMonthCache} from '../features/calendar'
import type {PSceneStyle} from '../features/focus-room-animation'
import {CalendarConnections} from './CalendarConnections'
import {CalendarMonth} from './CalendarMonth'
import {getPomoIconClass} from './icon-style'
import {PIconButton} from './PIconButton'
import {PModal} from './PModal'
import {MEMORY_ASSIST_ICON} from './memory-assist/icon'
import {PMemoryAssistTabList} from './memory-assist/TabList'
import {MemoryMemoList} from './memory-assist/Memos'
import {LanguageLearningLibrary} from './language-learning/Library'
import {LanguageLearningWords} from './language-learning/Words'
import {PScribbleCircleControl} from './scribble/CircleControl'

export interface PMemoryAssistProps {
  readonly sceneStyle?: PSceneStyle
}

export const PMemoryAssist = (props: PMemoryAssistProps) => {
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
        <PIconButton
          accessibleLabel={m.memory_assist_open()}
          feedback={m.memory_assist_feedback()}
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
          size="wide"
          title={m.memory_assist_title()}
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="sentences">
            <LanguageLearningLibrary onRequestClose={() => setIsOpen(false)} />
          </Tabs.Content>
          <Tabs.Content value="words">
            <LanguageLearningWords />
          </Tabs.Content>
          <Tabs.Content value="memos">
            <MemoryMemoList />
          </Tabs.Content>
          <Tabs.Content value="calendar">
            <CalendarMonth
              revision={calendarRevision()}
              settings={
                <CalendarConnections
                  onConnectionsChange={() => {
                    clearCalendarMonthCache()
                    refreshCalendar()
                  }}
                />
              }
            />
          </Tabs.Content>
        </PModal>
      </Tabs>
    </>
  )
}

export default PMemoryAssist
