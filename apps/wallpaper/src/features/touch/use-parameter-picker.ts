import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {TouchParameter} from './types'
import {interfaceLanguage} from '../localization'
import {parameterName} from '../builtin-assets/parameter-name'

interface UseParameterPickerOptions {
  /** Only parameters currently available for addition may be chosen. */
  readonly parameters: Accessor<readonly TouchParameter[]>
  /** Disables additions when true; omitted permits additions. */
  readonly disabled?: Accessor<boolean>
  /** Persists one addition. Concurrent choices are ignored until this completes. */
  readonly onSelect: (id: string) => void | Promise<void>
}

/** Owns search and sequential additions while retaining the open picker and current query. */
export const useParameterPicker = (options: UseParameterPickerOptions) => {
  const [expanded, setExpanded] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [pending, setPending] = createSignal(false)
  const filtered = createMemo(() => {
    const search = query().trim().toLocaleLowerCase()
    const language = interfaceLanguage.language()
    return options
      .parameters()
      .filter((parameter) =>
        `${parameterName(parameter, language)} ${parameter.name ?? ''} ${parameter.id}`
          .toLocaleLowerCase()
          .includes(search),
      )
  })
  const open = () => {
    setQuery('')
    setExpanded(true)
  }
  const close = () => {
    setExpanded(false)
  }
  const search = (value: string) => {
    setQuery(value)
  }
  const choose = async (id: string) => {
    if (
      options.disabled?.() ||
      pending() ||
      !options.parameters().some((parameter) => parameter.id === id)
    ) {
      return
    }
    setPending(true)
    try {
      await options.onSelect(id)
    } finally {
      setPending(false)
    }
  }
  return {choose, close, expanded, filtered, open, pending, query, search}
}
