import {createSignal} from 'solid-js'
import * as m from '@paraglide/message'
import {PButton} from '../PButton'
import {MemoryMemoModal} from './MemoryMemoModal'
import {useMemoCreator} from './use-memo-creator'

export const MemoryMemoCreator = () => {
  const creator = useMemoCreator()
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    creator.changeOpen(true)
  }

  return (
    <>
      <PButton
        bordered
        transparent
        class="w-full"
        icon="i-tabler-plus"
        onPress={handleOpen}
        tone="secondary"
      >
        {m.memory_memo_new()}
      </PButton>

      <MemoryMemoModal
        canSave={creator.canSave()}
        isOpen={creator.isOpen()}
        message={creator.message}
        onOpenChange={creator.changeOpen}
        onReminderChange={creator.changeReminder}
        onSave={creator.save}
        onTextInput={creator.changeText}
        reminderDraft={creator.reminderDraft}
        saveLabel={m.memory_memo_save()}
        text={creator.text}
        title={m.memory_memo_create_title()}
        triggerElement={triggerElement}
      />
    </>
  )
}
