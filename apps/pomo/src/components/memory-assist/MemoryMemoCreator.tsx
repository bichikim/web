import {createMemo, createSignal, onMount} from 'solid-js'

import * as m from '@paraglide/message'
import {
  createMemoryMemo,
  deleteMemoryMemoDraft,
  readMemoryMemoDraft,
  updateMemoryMemos,
  writeMemoryMemoDraft,
} from '../../features/memory-assist'
import {PButton} from '../PButton'
import {MemoryMemoModal} from './MemoryMemoModal'
import type {ReminderDraft} from './ReminderFields'
import {createReminderDraft, isFirstReminderInFuture, resolveReminderAt} from './reminder-draft'

const persistCreationDraft = (text: string, reminderDraft: ReminderDraft) => {
  writeMemoryMemoDraft({...reminderDraft, text, version: 1})
}

export const MemoryMemoCreator = () => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)
  const [text, setText] = createSignal('')
  const [reminderDraft, setReminderDraft] = createSignal(
    createReminderDraft({exactReminderAt: null, now: new Date(), recallMode: 'none'}),
  )
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
  const canSave = createMemo(() => text().trim().length > 0)

  const handleTextInput = (nextText: string) => {
    setText(nextText)
    persistCreationDraft(nextText, reminderDraft())
  }

  const handleReminderChange = (nextReminderDraft: ReminderDraft) => {
    setReminderDraft(nextReminderDraft)
    persistCreationDraft(text(), nextReminderDraft)
  }

  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setMessage(null)
    setIsOpen(true)
  }

  onMount(() => {
    const storedDraft = readMemoryMemoDraft()
    if (storedDraft === null) {
      return
    }

    setText(storedDraft.text)
    setReminderDraft({
      customDate: storedDraft.customDate,
      exactEnabled: storedDraft.exactEnabled,
      exactReminderAdvanceMinutes: storedDraft.exactReminderAdvanceMinutes,
      exactReminderRepeatEnabled: storedDraft.exactReminderRepeatEnabled,
      exactReminderRepeatIntervalMinutes: storedDraft.exactReminderRepeatIntervalMinutes,
      exactReminderRepeatUntilMinutes: storedDraft.exactReminderRepeatUntilMinutes,
      recallMode: storedDraft.recallMode,
      reminderDay: storedDraft.reminderDay,
      reminderTime: storedDraft.reminderTime,
    })
  })

  const handleSave = async () => {
    const now = new Date()
    const currentDraft = reminderDraft()
    const exactReminderAt = currentDraft.exactEnabled
      ? resolveReminderAt(
          currentDraft.reminderDay,
          currentDraft.customDate,
          currentDraft.reminderTime,
          now,
        )
      : null

    if (
      currentDraft.exactEnabled &&
      !isFirstReminderInFuture(exactReminderAt, currentDraft.exactReminderAdvanceMinutes, now)
    ) {
      setMessage(m.memory_memo_invalid_time())
      return
    }

    const memo = createMemoryMemo({
      exactReminderAdvanceMinutes: currentDraft.exactReminderAdvanceMinutes,
      exactReminderAt,
      exactReminderRepeatIntervalMinutes: currentDraft.exactReminderRepeatEnabled
        ? currentDraft.exactReminderRepeatIntervalMinutes
        : null,
      exactReminderRepeatUntilMinutes: currentDraft.exactReminderRepeatUntilMinutes,
      id: crypto.randomUUID(),
      now,
      random: Math.random,
      recallMode: currentDraft.recallMode,
      text: text(),
    })

    try {
      await updateMemoryMemos((currentMemos) => [memo, ...currentMemos])
      deleteMemoryMemoDraft()
      setText('')
      setReminderDraft(
        createReminderDraft({exactReminderAt: null, now: new Date(), recallMode: 'none'}),
      )
      setMessage(null)
      setIsOpen(false)
    } catch (error: unknown) {
      console.error('Failed to save a memory memo.', error)
      setMessage(m.memory_memo_save_failed())
    }
  }

  return (
    <>
      <PButton class="w-full" icon="i-tabler-plus" onPress={handleOpen} tone="secondary">
        {m.memory_memo_new()}
      </PButton>

      <MemoryMemoModal
        canSave={canSave()}
        isOpen={isOpen()}
        message={message}
        onOpenChange={setIsOpen}
        onReminderChange={handleReminderChange}
        onSave={handleSave}
        onTextInput={handleTextInput}
        reminderDraft={reminderDraft}
        saveLabel={m.memory_memo_save()}
        text={text}
        title={m.memory_memo_create_title()}
        triggerElement={triggerElement}
      />
    </>
  )
}
