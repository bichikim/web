import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {NavigationOptions} from './types'
import type {CodeLocation} from '../shared/contracts'
import {parseFileInput} from './parse-file-input'
import {isAbsolutePath} from './is-absolute-path'

interface UseFilePickerProps {
  busy: Accessor<boolean>
  files: Accessor<string[]>
  finding: Accessor<boolean>
  searchable: Accessor<boolean>
  onFind: (query: string) => void
  onOpen: (location: CodeLocation, options?: NavigationOptions) => void
}

export const useFilePicker = (props: UseFilePickerProps) => {
  const [query, setQuery] = createSignal('')
  const [expanded, setExpanded] = createSignal(false)
  const [activeIndex, setActiveIndex] = createSignal(-1)
  const input = createMemo(() => parseFileInput(query()))
  const activePath = (): string | null =>
    props.finding() ? null : (props.files()[activeIndex()] ?? null)
  const canSubmit = (): boolean => {
    if (props.busy()) {
      return false
    }
    const current = input()
    return current.kind === 'path'
      ? isAbsolutePath(current.location.path) || props.searchable()
      : props.searchable()
  }
  const change = (value: string): void => {
    setQuery(value)
    setActiveIndex(-1)
    const current = input()
    const searching = current.kind === 'search' && props.searchable()
    setExpanded(searching)
    if (searching && current.kind === 'search') {
      props.onFind(current.query)
    }
  }
  const show = (): void => {
    const current = input()
    if (!expanded() && current.kind === 'search' && props.searchable()) {
      setExpanded(true)
      setActiveIndex(-1)
      props.onFind(current.query)
    }
  }
  const dismiss = (): void => {
    setExpanded(false)
    setActiveIndex(-1)
  }
  const choose = (path: string): void => {
    if (props.busy() || props.finding() || !props.files().includes(path)) {
      return
    }
    setQuery(path)
    dismiss()
    props.onOpen({column: 1, line: 1, path}, {restoreView: true})
  }
  const move = (direction: -1 | 1): void => {
    if (input().kind !== 'search') {
      return
    }
    show()
    const count = props.files().length
    if (props.finding() || count === 0) {
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
      props.onOpen(current.location, {restoreView: current.restoreView})
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
