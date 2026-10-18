export interface PaginationOptions<Page, PageParam> {
  readonly initialPageParam: PageParam
  readonly getNextPageParam: (
    lastPage: Page,
    pages: ReadonlyArray<Page>,
    lastPageParam: PageParam,
    pageParams: ReadonlyArray<PageParam>,
  ) => PageParam | null | undefined
}

export interface PageQuery<Args extends unknown[], Page, PageParam> {
  (...args: [...Args, PageParam]): Promise<Page>
  readonly key: string
  readonly keyFor: (...args: [...Args, PageParam]) => string
}

export interface PaginatedPageQuery<Args extends unknown[], Page, PageParam>
  extends PageQuery<Args, Page, PageParam>, PaginationOptions<Page, PageParam> {}
