import {type Accessor, batch, createMemo, createSignal} from 'solid-js'
import {findText, type TextMatch} from './find-text'

interface DocumentSearchOptions {
  source: Accessor<string>
}

interface SearchCursor {
  matches: readonly TextMatch[]
  index: number
}

export const useDocumentSearch = (options: DocumentSearchOptions) => {
  const [visible, setVisible] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [focusRequest, setFocusRequest] = createSignal(0)
  const [scrollRequest, setScrollRequest] = createSignal(0)
  const [cursor, setCursor] = createSignal<SearchCursor | null>(null)
  const matches = createMemo(() => (visible() ? findText(options.source(), query()) : []))
  const active = createMemo(() => {
    const results = matches()
    if (results.length === 0) {
      return -1
    }
    const current = cursor()
    return current?.matches === results ? current.index : 0
  })
  const open = (text?: string): void => {
    batch(() => {
      if (text !== undefined && text !== '' && !/[\r\n]/u.test(text)) {
        setQuery(text)
      }
      setVisible(true)
      setFocusRequest((previous) => previous + 1)
      setScrollRequest((previous) => previous + 1)
    })
  }
  const move = (direction: -1 | 1): void => {
    const results = matches()
    if (results.length > 0) {
      batch(() => {
        setCursor({
          index: (active() + direction + results.length) % results.length,
          matches: results,
        })
        setScrollRequest((previous) => previous + 1)
      })
    }
  }
  const change = (text: string): void => {
    if (text !== query()) {
      batch(() => {
        setQuery(text)
        setScrollRequest((previous) => previous + 1)
      })
    }
  }
  return {
    active,
    change,
    close: () => setVisible(false),
    focusRequest,
    matches,
    move,
    open,
    query,
    scrollRequest,
    visible,
  }
}
