import {Tabs} from '@kobalte/core/tabs'
import {createSignal} from 'solid-js'

import * as m from '@paraglide/message'

import type {PSceneStyle} from '../features/focus-room-animation'
import {getPomoIconClass} from './icon-style'
import {PIconButton} from './PIconButton'
import {PModal} from './PModal'
import {PLearningTabList} from './learning/TabList'
import {LanguageLearningLibrary} from './language-learning/Library'
import {LanguageLearningWords} from './language-learning/Words'
import {PScribbleCircleControl} from './scribble/CircleControl'

export interface PLearningProps {
  readonly sceneStyle?: PSceneStyle
}

export const PLearning = (props: PLearningProps) => {
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
          accessibleLabel={m.learning_open()}
          feedback={m.learning_feedback()}
          icon={getPomoIconClass('i-tabler-book-2', props.sceneStyle)}
          onPress={handleOpen}
        />
      </PScribbleCircleControl>
      <Tabs class="contents" value={activeTab()} onChange={setActiveTab}>
        <PModal
          isOpen={isOpen()}
          navigation={<PLearningTabList />}
          onCloseAutoFocus={handleCloseAutoFocus}
          onOpenChange={setIsOpen}
          placement="top"
          size="wide"
          title={m.learning_title()}
          titleVisibility="visually-hidden"
        >
          <Tabs.Content value="sentences">
            <LanguageLearningLibrary onRequestClose={() => setIsOpen(false)} />
          </Tabs.Content>
          <Tabs.Content value="words">
            <LanguageLearningWords />
          </Tabs.Content>
        </PModal>
      </Tabs>
    </>
  )
}

export default PLearning
