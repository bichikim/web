import type {PageQuery, PaginatedPageQuery, PaginationOptions} from './types'

/** 호출 가능한 쿼리의 캐시 식별자를 유지하면서 페이지네이션 규칙을 추가한다. */
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
