import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

import type {PDialogue} from '../features/focus-room-dialogue/schema'

const CLASSES = {
  dialogueSettingsDialogueIcon: [
    'pomo-dialogue-settings__dialogue-icon inline-flex flex-none text-muted-foreground',
    'transition-[transform_140ms_ease] motion-reduce:transition-[none]',
  ].join(' '),
  dialogueSettingsDialogueIndicator: [
    'pomo-dialogue-settings__dialogue-indicator inline-flex w-4 h-4 items-center justify-center',
    'border border-solid border-border rounded text-transparent',
    '[&[data-checked]]:border-primary [&[data-checked]]:bg-primary',
    '[&[data-checked]]:text-foreground',
  ].join(' '),
  dialogueSettingsDialogueItem: [
    'pomo-dialogue-settings__dialogue-item grid min-h-11 cursor-pointer',
    'grid-cols-[auto_minmax(0,_1fr)] items-center gap-[0.6rem] rounded-[0.625rem]',
    'px-3 py-2 text-foreground text-[0.6875rem]',
    'outline-none [&[data-highlighted]]:bg-secondary-soft',
  ].join(' '),
  dialogueSettingsDialogueItemClear: [
    'pomo-dialogue-settings__dialogue-item--clear text-muted-foreground',
    '[&[data-disabled]]:[cursor:default] [&[data-disabled]]:[opacity:0.45]',
  ].join(' '),
  dialogueSettingsDialogueItemText: [
    'pomo-dialogue-settings__dialogue-item-text grid min-w-0 gap-[0.2rem]',
    '[&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap',
    '[&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap',
    '[&_strong]:block [&_strong]:max-w-[28ch] [&_strong]:text-[0.7rem] [&_strong]:font-bold',
    '[&_small]:text-muted-foreground [&_small]:text-[0.6rem]',
  ].join(' '),
  dialogueSettingsDialogueMenu: [
    'pomo-dialogue-settings__dialogue-menu grid w-[min(21rem,_calc(100vw_-_2rem))]',
    'max-h-[min(18rem,_var(--kb-popper-available-height))] box-border gap-[0.15rem]',
    'overflow-y-auto border border-solid border-border rounded-[0.875rem]',
    'bg-surface-strong p-2 text-foreground',
    'shadow-panel outline-none origin-[var(--kb-menu-content-transform-origin)]',
    'animate-dialogue-menu-in motion-reduce:animate-[none]',
  ].join(' '),
  dialogueSettingsDialogueTrigger: [
    'pomo-dialogue-settings__dialogue-trigger',
    '[&:focus-visible]:outline-2 [&:focus-visible]:outline-solid [&:focus-visible]:outline-highlight',
    '[&:focus-visible]:[outline-offset:2px] inline-flex w-40 min-h-8 box-border cursor-pointer',
    'items-center justify-between gap-2 border border-solid border-border',
    'rounded-control bg-transparent',
    'pl-3 pr-2 text-foreground',
    '[font:inherit] text-[0.65rem] font-bold',
    'transition-[border-color_140ms_ease,_background-color_140ms_ease,_color_140ms_ease]',
    '[&:hover:not(:disabled)]:border-[rgb(214_181_133_/_38%)]',
    '[&:hover:not(:disabled)]:bg-secondary-soft',
    '[&[data-expanded]]:border-[rgb(214_181_133_/_38%)]',
    '[&[data-expanded]]:bg-secondary-soft [&:disabled]:[cursor:not-allowed]',
    '[&:disabled]:text-muted-foreground [&:disabled]:[opacity:0.55]',
    '[&[data-expanded]_[data-pomo-dialogue-icon]]:rotate-180',
    'max-[42rem]:w-full motion-reduce:transition-[none]',
  ].join(' '),
  dialogueSettingsDialogueTriggerText: [
    'pomo-dialogue-settings__dialogue-trigger-text block max-w-[20ch] min-w-0 overflow-hidden',
    'text-ellipsis whitespace-nowrap',
  ].join(' '),
} as const

interface DialogueConnectionMenuProps {
  readonly dialogues: ReadonlyArray<PDialogue>
  readonly disabled: boolean
  readonly getMetadata: (dialogue: PDialogue) => string
  readonly onChange: (dialogueIds: ReadonlyArray<string>) => void
  readonly selectedDialogueIds: ReadonlyArray<string>
}

export const DialogueConnectionMenu = (props: DialogueConnectionMenuProps) => {
  const selectedDialogues = () =>
    props.selectedDialogueIds.flatMap((dialogueId) => {
      const dialogue = props.dialogues.find((item) => item.id === dialogueId)
      return dialogue === undefined ? [] : [dialogue]
    })
  const triggerLabel = () => {
    const selected = selectedDialogues()

    if (selected.length === 0) {
      return props.dialogues.length === 0 ? '대화 없음' : '대화 선택'
    }

    return selected.length === 1 ? selected[0]?.text : `${selected.length}개 대화 연속 재생`
  }
  const toggleDialogue = (dialogueId: string, isChecked: boolean) => {
    const currentIds = props.selectedDialogueIds
    const dialogueIds = isChecked
      ? [...currentIds.filter((id) => id !== dialogueId), dialogueId]
      : currentIds.filter((id) => id !== dialogueId)
    props.onChange(dialogueIds)
  }

  return (
    <DropdownMenu gutter={6} placement="bottom-end">
      <DropdownMenu.Trigger
        class={CLASSES.dialogueSettingsDialogueTrigger}
        disabled={props.disabled}
      >
        <span
          class={CLASSES.dialogueSettingsDialogueTriggerText}
          title={selectedDialogues()
            .map((dialogue) => dialogue.text)
            .join('\n')}
        >
          {triggerLabel()}
        </span>
        <DropdownMenu.Icon class={CLASSES.dialogueSettingsDialogueIcon} data-pomo-dialogue-icon="">
          <span aria-hidden="true" class="i-tabler-chevron-down size-4" />
        </DropdownMenu.Icon>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class={cx(
            'border border-solid border-border backdrop-blur-surface',
            CLASSES.dialogueSettingsDialogueMenu,
          )}
        >
          <DropdownMenu.Item
            class={cx(
              CLASSES.dialogueSettingsDialogueItem,
              CLASSES.dialogueSettingsDialogueItemClear,
            )}
            disabled={props.selectedDialogueIds.length === 0}
            onSelect={() => props.onChange([])}
          >
            <span aria-hidden="true" class="i-tabler-unlink size-4" />
            <span class={CLASSES.dialogueSettingsDialogueItemText}>
              <strong>모두 연결 해제</strong>
            </span>
          </DropdownMenu.Item>
          <For each={props.dialogues}>
            {(dialogue) => (
              <DropdownMenu.CheckboxItem
                checked={props.selectedDialogueIds.includes(dialogue.id)}
                class={CLASSES.dialogueSettingsDialogueItem}
                onChange={(isChecked) => toggleDialogue(dialogue.id, isChecked)}
              >
                <DropdownMenu.ItemIndicator
                  class={CLASSES.dialogueSettingsDialogueIndicator}
                  forceMount
                >
                  <span aria-hidden="true" class="i-tabler-check size-3.5" />
                </DropdownMenu.ItemIndicator>
                <span class={CLASSES.dialogueSettingsDialogueItemText}>
                  <strong title={dialogue.text}>{dialogue.text}</strong>
                  <small>{props.getMetadata(dialogue)}</small>
                </span>
              </DropdownMenu.CheckboxItem>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
