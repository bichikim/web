import {createSignal} from 'solid-js'

interface ToolsDialogOpenOptions {
  readonly selected?: string
  readonly trigger?: HTMLButtonElement
}

const [isOpen, setIsOpen] = createSignal(false)
const [selected, setSelected] = createSignal('units')
let returnFocusTarget: HTMLButtonElement | null = null

export const toolsDialog = {
  isOpen,
  onOpenChange: setIsOpen,
  onSelectedChange: setSelected,
  open(options: ToolsDialogOpenOptions = {}): void {
    returnFocusTarget = options.trigger ?? null
    setSelected(options.selected ?? selected())
    setIsOpen(true)
  },
  restoreFocus(): void {
    returnFocusTarget?.focus()
  },
  selected,
}
