import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {NavigationOptions} from './types'
import type {CodeLocation} from '../shared/contracts'
import {parseFileInput} from './parse-file-input'

interface FilePickerOptions {
  busy: Accessor<boolean>
  files: Accessor<string[]>
  finding: Accessor<boolean>
  searchable: Accessor<boolean>
  onFind: (query: string) => void
  onOpen: (location: CodeLocation, options?: NavigationOptions) => void
}

export const useFilePicker = (options: FilePickerOptions) => {
  const [query, setQuery] = createSignal('')
  const [expanded, setExpanded] = createSignal(false)
  const [activeIndex, setActiveIndex] = createSignal(-1)
  const input = createMemo(() => parseFileInput(query()))
  const activePath = (): string | null =>
    options.finding() ? null : (options.files()[activeIndex()] ?? null)
  const canSubmit = (): boolean => {
    if (options.busy()) {
      return false
    }
    const current = input()
    return current.kind === 'path'
      ? current.location.path.startsWith('/') || options.searchable()
      : options.searchable()
  }
  const change = (value: string): void => {
    setQuery(value)
    setActiveIndex(-1)
    const current = input()
    const searching = current.kind === 'search' && options.searchable()
    setExpanded(searching)
    if (searching && current.kind === 'search') {
      options.onFind(current.query)
    }
  }
  const show = (): void => {
    const current = input()
    if (!expanded() && current.kind === 'search' && options.searchable()) {
      setExpanded(true)
      setActiveIndex(-1)
      options.onFind(current.query)
    }
  }
  const dismiss = (): void => {
    setExpanded(false)
    setActiveIndex(-1)
  }
  const choose = (path: string): void => {
    if (options.busy() || options.finding() || !options.files().includes(path)) {
      return
    }
    setQuery(path)
    dismiss()
    options.onOpen({column: 1, line: 1, path}, {restoreView: true})
  }
  const move = (direction: -1 | 1): void => {
    if (input().kind !== 'search') {
      return
    }
    show()
    const count = options.files().length
    if (options.finding() || count === 0) {
      return
    }
    const index = activeIndex()
    setActiveIndex(
      index < 0 ? (direction === 1 ? 0 : count - 1) : (index + direction + count) % count,
    )
  }
  const submit = (): void => {
    if (!canSubmit()) {
      return
    }
    const current = input()
    if (current.kind === 'path') {
      dismiss()
      options.onOpen(current.location, {restoreView: current.restoreView})
      return
    }
    const path = activePath()
    if (path === null) {
      show()
    } else {
      choose(path)
    }
  }
  return {
    activeIndex,
    activePath,
    canSubmit,
    change,
    choose,
    dismiss,
    expanded,
    input,
    move,
    query,
    show,
    submit,
  }
}
