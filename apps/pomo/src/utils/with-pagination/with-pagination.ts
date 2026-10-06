import type {PageQuery, PaginatedPageQuery, PaginationOptions} from './types'

/** Adds pagination rules to a callable query while preserving its cache identity. */
export const withPagination = <Args extends unknown[], Page, PageParam>(
  pageQuery: PageQuery<Args, Page, PageParam>,
  options: PaginationOptions<Page, PageParam>,
): PaginatedPageQuery<Args, Page, PageParam> =>
  Object.assign((...args: [...Args, PageParam]) => pageQuery(...args), {
    getNextPageParam: options.getNextPageParam,
    initialPageParam: options.initialPageParam,
    key: pageQuery.key,
    keyFor: (...args: [...Args, PageParam]) => pageQuery.keyFor(...args),
  })
