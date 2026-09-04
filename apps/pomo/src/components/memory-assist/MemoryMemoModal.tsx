import {cx} from 'class-variance-authority'
import {createSignal, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {MAXIMUM_MEMORY_MEMO_LENGTH} from '../../features/memory-assist'
import {PButton} from '../PButton'
import {PModal} from '../PModal'
import {type ReminderDraft, ReminderFields} from './ReminderFields'
import {getDateInputValue} from './reminder-draft'

const TEXTAREA_CLASSES = cx(
  'box-border min-h-24 w-full resize-y rounded-5 border border-solid border-border',
  'bg-surface-strong p-4 text-base font-500 leading-7 text-foreground outline-none',
  'transition-[border-color_160ms_ease,box-shadow_160ms_ease]',
  'placeholder:text-muted-foreground focus-visible:border-highlight focus-visible:shadow-focus',
  'motion-reduce:transition-none',
)

export interface MemoryMemoModalProps {
  readonly canSave: boolean
  readonly isOpen: boolean
  readonly message: () => string | null
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onReminderChange: (draft: ReminderDraft) => void
  readonly onSave: () => Promise<void>
  readonly onTextInput: (text: string) => void
  readonly reminderDraft: () => ReminderDraft
  readonly saveLabel: string
  readonly text: () => string
  readonly title: string
  readonly triggerElement: () => HTMLElement | null
}

export const MemoryMemoModal = (props: MemoryMemoModalProps) => {
  const [isPending, setIsPending] = createSignal(false)
  const [textAreaElement, setTextAreaElement] = createSignal<HTMLTextAreaElement | null>(null)

  const handleSave = async () => {
    if (isPending()) {
      return
    }

    setIsPending(true)

    try {
      await props.onSave()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <PModal
      getInitialFocus={textAreaElement}
      isOpen={props.isOpen}
      onCloseAutoFocus={() => props.triggerElement()?.focus()}
      onOpenChange={props.onOpenChange}
      placement="top"
      title={props.title}
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-650 text-foreground">
          <span>{m.memory_memo_input()}</span>
          <textarea
            class={TEXTAREA_CLASSES}
            maxlength={MAXIMUM_MEMORY_MEMO_LENGTH}
            onInput={(event) => props.onTextInput(event.currentTarget.value)}
            placeholder={m.memory_memo_placeholder()}
            ref={setTextAreaElement}
            value={props.text()}
          />
        </label>

        <ReminderFields
          draft={props.reminderDraft}
          minimumDate={getDateInputValue(new Date())}
          onChange={props.onReminderChange}
        />

        <Show when={props.message()}>
          {(currentMessage) => (
            <p aria-live="polite" class="m-0 text-sm text-danger" role="status">
              {currentMessage()}
            </p>
          )}
        </Show>

        <PButton class="w-full" disabled={!props.canSave || isPending()} onPress={handleSave}>
          {props.saveLabel}
        </PButton>
      </div>
    </PModal>
  )
}
