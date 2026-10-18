import {revalidate} from '@solidjs/router'
import {batch, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import {usePaginatedList} from '../use-paginated-list'

import type {
  PageLoadResult,
  PaginatedQuery,
  RefreshPageOptions,
  UsePaginatedQueryProps,
} from './types'

interface PageLoadOptions<Args extends unknown[], Page, PageParam> {
  readonly parameters: [...Args, PageParam]
  readonly generation: number
  readonly getInvalidationKey: () => string | undefined
  readonly applyPage: (page: Page) => void
  readonly setFailed: (failed: boolean) => void
  readonly setLoading: (loading: boolean) => void
}

/** Loads and accumulates query pages with independent state for each owner and argument scope. */
export const usePaginatedQuery = <Args extends unknown[], Page, Item, Key, PageParam>(
  props: UsePaginatedQueryProps<Args, Page, Item, Key, PageParam>,
): PaginatedQuery<Page, Item, Key, PageParam> => {
  const list = usePaginatedList({
    getItems: props.getItems,
    getKey: props.getKey,
    getNextPageParam: props.query.getNextPageParam,
    initialPageParam: props.query.initialPageParam,
  })
  const args = createMemo(props.args)
  let currentArgs = args()
  const [isLoading, setIsLoading] = createSignal(true)
  const [isLoadingMore, setIsLoadingMore] = createSignal(false)
  const [loadFailed, setLoadFailed] = createSignal(false)
  const [loadMoreFailed, setLoadMoreFailed] = createSignal(false)
  let generation = 0

  const reset = (): void => {
    generation += 1
    batch(() => {
      list.reset()
      setIsLoading(false)
      setIsLoadingMore(false)
      setLoadFailed(false)
      setLoadMoreFailed(false)
    })
  }
  const synchronizeArgs = (incoming: Args): void => {
    if (incoming === currentArgs) {
      return
    }
    currentArgs = incoming
    reset()
  }
  const loadPage = async (
    options: PageLoadOptions<Args, Page, PageParam>,
  ): Promise<PageLoadResult<Page>> => {
    const current = options.generation
    try {
      const invalidationKey = options.getInvalidationKey()
      if (invalidationKey !== undefined) {
        await revalidate(invalidationKey)
      }
      const page = await props.query(...options.parameters)
      if (current !== generation) {
        return {status: 'cancelled'}
      }
      options.applyPage(page)
      return {page, status: 'loaded'}
    } catch {
      if (current !== generation) {
        return {status: 'cancelled'}
      }
      options.setFailed(true)
      return {status: 'failed'}
    } finally {
      if (current === generation) {
        options.setLoading(false)
      }
    }
  }
  const refresh = async (options: RefreshPageOptions<Item> = {}): Promise<PageLoadResult<Page>> => {
    const incoming = args()
    synchronizeArgs(incoming)
    generation += 1
    const current = generation
    const pageParam = props.query.initialPageParam
    batch(() => {
      setIsLoading(true)
      setIsLoadingMore(false)
      setLoadFailed(false)
      setLoadMoreFailed(false)
    })
    return loadPage({
      applyPage: (page) => list.replacePage(page, pageParam, options),
      generation: current,
      getInvalidationKey: () => (options.invalidate === false ? undefined : props.query.key),
      parameters: [...incoming, pageParam],
      setFailed: setLoadFailed,
      setLoading: setIsLoading,
    })
  }
  const loadMore = async (): Promise<PageLoadResult<Page>> => {
    const incoming = args()
    synchronizeArgs(incoming)
    const pageParam = list.nextPageParam()
    if (isLoading() || isLoadingMore() || pageParam === null || pageParam === undefined) {
      return {status: 'skipped'}
    }
    const current = generation
    const parameters: [...Args, PageParam] = [...incoming, pageParam]
    const retry = loadMoreFailed()
    setIsLoadingMore(true)
    setLoadMoreFailed(false)
    return loadPage({
      applyPage: (page) => list.appendPage(page, pageParam),
      generation: current,
      getInvalidationKey: () => (retry ? props.query.keyFor(...parameters) : undefined),
      parameters,
      setFailed: setLoadMoreFailed,
      setLoading: setIsLoadingMore,
    })
  }
  onCleanup(() => {
    generation += 1
  })
  createEffect(
    on(args, (incoming) => {
      synchronizeArgs(incoming)
      if (generation === 0) {
        setIsLoading(false)
      }
    }),
  )
  return {...list, isLoading, isLoadingMore, loadFailed, loadMore, loadMoreFailed, refresh, reset}
}
