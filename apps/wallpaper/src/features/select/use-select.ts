import {type Accessor, createEffect, createMemo, createSignal} from 'solid-js'
import type {SelectOption} from './types'

const TYPEAHEAD_WINDOW_MS = 700

interface UseSelectProps<Value extends string> {
  readonly options: Accessor<readonly SelectOption<Value>[]>
  readonly value: Accessor<Value | undefined>
  readonly disabled: Accessor<boolean>
  readonly onChange?: (value: Value) => void | Promise<void>
}

export const useSelect = <Value extends string>(props: UseSelectProps<Value>) => {
  const [expanded, setExpanded] = createSignal(false)
  const [activeIndex, setActiveIndex] = createSignal(0)
  const [local, setLocal] = createSignal<Value | null>(null)
  const value = createMemo(() => props.value() ?? local() ?? props.options()[0]?.value)
  const selectedIndex = createMemo(() =>
    Math.max(
      0,
      props.options().findIndex((option) => option.value === value()),
    ),
  )
  let search = ''
  let searchedAt = 0
  const dismiss = () => setExpanded(false)
  const show = () => {
    if (!props.disabled() && props.options().length > 0 && !expanded()) {
      setActiveIndex(selectedIndex())
      setExpanded(true)
      search = ''
    }
  }
  const toggle = () => (expanded() ? dismiss() : show())
  const choose = (value: Value) => {
    if (props.disabled()) {
      return
    }
    dismiss()
    setLocal(() => value)
    return props.onChange?.(value)
  }
  const accept = () => {
    const option = props.options()[activeIndex()]
    if (option !== undefined) {
      return choose(option.value)
    }
    dismiss()
  }
  const move = (direction: -1 | 1) => {
    if (!expanded()) {
      show()
      return
    }
    const count = props.options().length
    setActiveIndex((activeIndex() + direction + count) % count)
  }
  const find = (event: KeyboardEvent): boolean => {
    const previous = event.timeStamp - searchedAt <= TYPEAHEAD_WINDOW_MS ? search : ''
    const typed = previous + event.key.toLocaleLowerCase()
    const prefix = typed === typed[0]?.repeat(typed.length) ? typed[0]! : typed
    const options = props.options()
    const start = prefix.length === 1 ? activeIndex() + 1 : activeIndex()
    const index = options
      .map((_, index) => (start + index) % options.length)
      .find((index) => options[index]!.label.toLocaleLowerCase().startsWith(prefix))
    if (index === undefined) {
      return false
    }
    show()
    search = typed
    searchedAt = event.timeStamp
    setActiveIndex(index)
    return true
  }
  const keyboard = (event: KeyboardEvent): boolean => {
    if (
      props.disabled() ||
      props.options().length === 0 ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return false
    }
    switch (event.key) {
      case 'ArrowDown':
        move(1)
        return true
      case 'ArrowUp':
        move(-1)
        return true
      case 'Home':
        show()
        setActiveIndex(0)
        return true
      case 'End':
        show()
        setActiveIndex(props.options().length - 1)
        return true
      case 'Enter':
      case ' ':
        if (expanded()) {
          accept()
        } else {
          show()
        }
        return true
      case 'Escape':
        if (!expanded()) {
          return false
        }
        dismiss()
        return true
      case 'Tab':
        if (expanded()) {
          accept()
        }
        return false
      default:
        return event.key.length === 1 && find(event)
    }
  }
  createEffect(() => {
    if (props.disabled() || props.options().length === 0) {
      dismiss()
    } else if (activeIndex() >= props.options().length) {
      setActiveIndex(selectedIndex())
    }
  })
  return {activeIndex, choose, dismiss, expanded, keyboard, toggle, value}
}
