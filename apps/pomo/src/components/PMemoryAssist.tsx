import {Tabs} from '@kobalte/core/tabs'
import {createSignal} from 'solid-js'

import * as m from '@paraglide/message'

import type {PSceneStyle} from '../features/focus-room-animation'
import type {WeatherState} from '../features/weather'
import {getPomoIconClass} from './icon-style'
import {PIconButton} from './PIconButton'
import {PModal} from './PModal'
import {MEMORY_ASSIST_ICON} from './memory-assist/icon'
import {PMemoryAssistTabList} from './memory-assist/TabList'
import {MemoryMemoList} from './memory-assist/Memos'
import {PictureDiary} from './memory-assist/PictureDiary'
import {LanguageLearningLibrary} from './language-learning/Library'
import {LanguageLearningWords} from './language-learning/Words'
import {PScribbleCircleControl} from './scribble/CircleControl'

export interface PMemoryAssistProps {
  readonly sceneStyle?: PSceneStyle
  readonly weatherState?: WeatherState
}

export const PMemoryAssist = (props: PMemoryAssistProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('sentences')
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setIsOpen(true)
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
      <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
        <PModal
          isOpen={isOpen()}
          navigation={<PMemoryAssistTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="full"
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
          <Tabs.Content value="picture-diary">
            <PictureDiary weatherState={props.weatherState} />
          </Tabs.Content>
        </PModal>
      </Tabs>
    </>
  )
}

export default PMemoryAssist
