import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import {createTextSearch} from './create-text-search'
import type {TextMatch} from '../find-text'
import type {PdfDocument} from './types'

interface PdfSearchOptions {
  readonly document: Accessor<PdfDocument | null>
  readonly turn: (page: number) => void
}
interface PageText {
  readonly page: number
  readonly hasText: boolean
  readonly find: (query: string, limit?: number) => readonly TextMatch[]
}
interface SearchIndex {
  readonly document: PdfDocument
  readonly texts: readonly PageText[]
}
interface PageMatch extends TextMatch {
  readonly page: number
}
interface SearchCursor {
  readonly matches: readonly PageMatch[]
  readonly index: number
}
const MAX_MATCHES = 10000
const MAX_PAGES = 2048
const MAX_CHARACTERS = 4194304

/** Provides lazy document-wide PDF search with bounded extracted text and page navigation. */
export const usePdfSearch = (options: PdfSearchOptions) => {
  const [visible, setVisible] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [focusRequest, setFocusRequest] = createSignal(0)
  const [scrollRequest, setScrollRequest] = createSignal(0)
  const [index, setIndex] = createSignal<SearchIndex | null>(null)
  const [cursor, setCursor] = createSignal<SearchCursor | null>(null)
  const [status, setStatus] = createSignal('')
  const [pending, setPending] = createSignal(false)
  createEffect(() => {
    const document = options.document()
    const opened = visible()
    if (document === null || !opened || untrack(index)?.document === document) {
      return
    }
    let disposed = false
    onCleanup(() => {
      disposed = true
    })
    setPending(true)
    setStatus('PDF 텍스트 읽는 중…')
    const read = async (): Promise<void> => {
      const texts: PageText[] = []
      let length = 0
      for (let page = 1; page <= Math.min(document.pages, MAX_PAGES); page += 1) {
        // Extract sequentially so departing a file stops further worker requests and limits memory.
        // oxlint-disable-next-line no-await-in-loop
        const source = await document.text(page)
        if (disposed) {
          return
        }
        const available = MAX_CHARACTERS - length
        const limited = source.slice(0, available)
        texts.push({find: createTextSearch(limited), hasText: limited.trim() !== '', page})
        length += source.length
        if (length >= MAX_CHARACTERS) {
          break
        }
      }
      const truncated = length >= MAX_CHARACTERS || document.pages > MAX_PAGES
      batch(() => {
        setIndex({document, texts})
        setPending(false)
        setStatus(
          truncated
            ? '검색 상한에 도달해 문서 앞부분만 검색합니다.'
            : texts.some((text) => text.hasText)
              ? ''
              : '이 PDF에는 검색 가능한 텍스트가 없습니다.',
        )
      })
    }
    read().catch(() => {
      if (!disposed) {
        setPending(false)
        setStatus('PDF 텍스트를 읽을 수 없습니다. 검색을 다시 열어 재시도해 주세요.')
      }
    })
  })
  const found = createMemo<readonly PageMatch[]>(() => {
    const value = index()
    if (!visible() || value?.document !== options.document()) {
      return []
    }
    const results: PageMatch[] = []
    const request = query()
    for (const text of value.texts) {
      results.push(
        ...text
          .find(request, MAX_MATCHES + 1 - results.length)
          .map((match) => ({...match, page: text.page})),
      )
      if (results.length > MAX_MATCHES) {
        return results
      }
    }
    return results
  })
  const matches = createMemo(() => found().slice(0, MAX_MATCHES))
  const active = createMemo(() => {
    const results = matches()
    const value = cursor()
    return results.length === 0 ? -1 : value?.matches === results ? value.index : 0
  })
  const current = createMemo(() => matches()[active()])
  createEffect(() => {
    scrollRequest()
    const match = current()
    if (match !== undefined) {
      untrack(() => options.turn(match.page))
    }
  })
  return {
    active,
    change: (value: string) => setQuery(value),
    close: () => setVisible(false),
    current,
    focusRequest,
    matches,
    move: (direction: -1 | 1) => {
      const results = matches()
      if (results.length > 0) {
        batch(() => {
          setCursor({
            index: (active() + direction + results.length) % results.length,
            matches: results,
          })
          setScrollRequest((value) => value + 1)
        })
      }
    },
    open: (text?: string) =>
      batch(() => {
        if (text !== undefined && text.trim() !== '') {
          setQuery(text.trim().replace(/\s+/gu, ' '))
        }
        setVisible(true)
        setFocusRequest((value) => value + 1)
      }),
    pending,
    query,
    scrollRequest,
    status: () =>
      found().length > MAX_MATCHES
        ? `검색 결과는 처음 ${MAX_MATCHES.toLocaleString()}개까지 표시합니다.`
        : status(),
    visible,
  }
}
