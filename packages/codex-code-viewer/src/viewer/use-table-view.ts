import {selectTableRows} from '../headless/select-table-rows'
import {useTranslations} from './locale/use-translations'
import {type Accessor, batch, createEffect, createMemo, createSignal} from 'solid-js'
import {parseDelimitedText} from './parse-delimited-text'
import type {TableResult} from './table/types'

interface UseTableViewProps {
  readonly source?: Accessor<string>
  readonly delimiter?: Accessor<',' | '\t'>
  readonly data?: Accessor<TableResult | undefined>
  readonly initialHeader?: Accessor<boolean>
}
interface TableSort {
  readonly column: number
  readonly descending: boolean
}
const PAGE_ROWS = 50
export const useTableView = (props: UseTableViewProps) => {
  const t = useTranslations()
  const data = createMemo(
    () =>
      props.data?.() ??
      parseDelimitedText({
        delimiter: props.delimiter?.() ?? ',',
        source: props.source?.() ?? '',
      }),
  )
  const [header, setHeader] = createSignal(props.initialHeader?.() ?? true)
  const [query, setQuery] = createSignal('')
  const [sort, setSort] = createSignal<TableSort | null>(null)
  const [page, setPage] = createSignal(1)
  createEffect(() => {
    data()
    batch(() => {
      setHeader(props.initialHeader?.() ?? true)
      setQuery('')
      setSort(null)
      setPage(1)
    })
  })
  const headers = createMemo(() => {
    const parsed = data()
    return parsed.ok
      ? Array.from({length: parsed.columns}, (_, index) =>
          header()
            ? parsed.rows[0]?.[index] || t('열 {count}', {count: index + 1})
            : (parsed.columnNames?.[index] ?? t('열 {count}', {count: index + 1})),
        )
      : []
  })
  const records = createMemo(() => {
    const parsed = data()
    if (!parsed.ok) {
      return []
    }
    return selectTableRows({header: header(), query: query(), rows: parsed.rows, sort: sort()})
  })
  const pages = createMemo(() => Math.max(1, Math.ceil(records().length / PAGE_ROWS)))
  const visible = createMemo(() => records().slice((page() - 1) * PAGE_ROWS, page() * PAGE_ROWS))
  const changeQuery = (value: string): void =>
    batch(() => {
      setQuery(value)
      setPage(1)
    })
  const changeHeader = (value: boolean): void =>
    batch(() => {
      setHeader(value)
      setSort(null)
      setPage(1)
    })
  const order = (column: number): void => {
    const previous = sort()
    batch(() => {
      setSort({column, descending: previous?.column === column && !previous.descending})
      setPage(1)
    })
  }
  const move = (direction: -1 | 1): void => {
    setPage((previous) => Math.max(1, Math.min(pages(), previous + direction)))
  }
  const truncated = (): boolean => {
    const parsed = data()
    return parsed.ok && parsed.truncated
  }
  return {
    changeHeader,
    changeQuery,
    count: () => records().length,
    data,
    header,
    headers,
    move,
    order,
    page,
    pages,
    query,
    sort,
    truncated,
    visible,
  }
}
