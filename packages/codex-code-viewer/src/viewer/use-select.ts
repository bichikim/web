import {type Accessor, createMemo, createSignal} from 'solid-js'

interface UseSelectProps {
  readonly options: Accessor<readonly string[]>
  readonly value: Accessor<string | undefined>
  readonly onChange: (value: string) => void
}

export const useSelect = (props: UseSelectProps) => {
  const [expanded, setExpanded] = createSignal(false)
  const [activeIndex, setActiveIndex] = createSignal(0)
  const [chosen, setChosen] = createSignal<string | null>(null)
  const value = createMemo(() => props.value() ?? chosen() ?? props.options()[0])
  const selectedIndex = createMemo(() => Math.max(0, props.options().indexOf(value() ?? '')))
  const dismiss = (): void => {
    setExpanded(false)
  }
  const show = (): void => {
    if (props.options().length > 0 && !expanded()) {
      setActiveIndex(selectedIndex())
      setExpanded(true)
    }
  }
  const toggle = (): void => {
    if (expanded()) {
      dismiss()
    } else {
      show()
    }
  }
  const choose = (value: string): void => {
    dismiss()
    setChosen(value)
    props.onChange(value)
  }
  const move = (direction: -1 | 1): void => {
    if (!expanded()) {
      show()
      return
    }
    const count = props.options().length
    if (count > 0) {
      setActiveIndex((activeIndex() + direction + count) % count)
    }
  }
  const find = (key: string): boolean => {
    const options = props.options()
    const start = expanded() ? activeIndex() + 1 : selectedIndex() + 1
    const indices = options.map((_, index) => (start + index) % options.length)
    const index = indices.find((entry) =>
      options[entry].toLocaleLowerCase().startsWith(key.toLocaleLowerCase()),
    )
    if (index === undefined) {
      return false
    }
    show()
    setActiveIndex(index)
    return true
  }
  const keyboard = (event: KeyboardEvent): boolean => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
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
        if (!expanded()) {
          return false
        }
        const value = props.options()[activeIndex()]
        if (value !== undefined) {
          choose(value)
        }
        return true
      case 'Escape':
        if (!expanded()) {
          return false
        }
        dismiss()
        return true
      case 'Tab':
        dismiss()
        return false
      default:
        return event.key.length === 1 && find(event.key)
    }
  }
  return {activeIndex, choose, dismiss, expanded, keyboard, toggle, value}
}
