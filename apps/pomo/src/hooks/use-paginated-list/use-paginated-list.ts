import {uniqBy} from 'es-toolkit/array'
import {batch, createMemo, createSignal, untrack} from 'solid-js'

import type {PaginatedList, ReplacePageOptions, UsePaginatedListProps} from './types'

interface PageEntry<Page, PageParam> {
  readonly page: Page
  readonly pageParam: PageParam
}

/** Stores original pages and their parameters while accumulating keyed display rows. */
export const usePaginatedList = <Page, Item, Key, PageParam>(
  props: UsePaginatedListProps<Page, Item, Key, PageParam>,
): PaginatedList<Page, Item, Key, PageParam> => {
  const [items, setItems] = createSignal<ReadonlyArray<Item>>([])
  const [entries, setEntries] = createSignal<ReadonlyArray<PageEntry<Page, PageParam>>>([])
  const pages = createMemo(() => entries().map((entry) => entry.page))
  const pageParams = createMemo(() => entries().map((entry) => entry.pageParam))
  const nextPageParam = createMemo<PageParam | null | undefined>(() => {
    const last = entries().at(-1)
    if (last === undefined) {
      return props.initialPageParam
    }
    const currentPages = pages()
    const currentParams = pageParams()
    return untrack(() =>
      props.getNextPageParam(last.page, currentPages, last.pageParam, currentParams),
    )
  })

  const applyPage = (
    incomingEntries: ReadonlyArray<PageEntry<Page, PageParam>>,
    incomingItems: ReadonlyArray<Item>,
  ): void => {
    const uniqueItems = untrack(() => uniqBy(incomingItems, (item) => props.getKey(item)))
    batch(() => {
      setItems(uniqueItems)
      setEntries(incomingEntries)
    })
  }
  const appendPage = (page: Page, pageParam: PageParam): void => {
    const incoming = untrack(() => props.getItems(page))
    applyPage([...entries(), {page, pageParam}], [...items(), ...incoming])
  }
  const replacePage = (
    page: Page,
    pageParam: PageParam,
    options: ReplacePageOptions<Item> = {},
  ): void => {
    const current = items()
    const incoming = untrack(() => props.getItems(page))
    const reconciled = untrack(() => options.reconcileItems?.(current, incoming) ?? incoming)
    applyPage([{page, pageParam}], options.retainItems ? [...reconciled, ...current] : reconciled)
  }
  const updateItem = (key: Key, update: (item: Item) => Item): void => {
    const keys = new Set([key])
    setItems((current) =>
      untrack(() => current.map((item) => (keys.has(props.getKey(item)) ? update(item) : item))),
    )
  }
  const reset = (): void => {
    batch(() => {
      setItems([])
      setEntries([])
    })
  }
  return {appendPage, items, nextPageParam, pageParams, pages, replacePage, reset, updateItem}
}
