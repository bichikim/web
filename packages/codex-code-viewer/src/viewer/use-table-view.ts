import {type Accessor, batch, createEffect, createMemo, createSignal} from 'solid-js'
import {parseDelimitedText} from './parse-delimited-text'
import type {TableResult} from './table/types'

interface TableViewOptions {
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
const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u

const compareCells = (left: string, right: string): number => {
  const first = Number(left)
  const second = Number(right)
  return DECIMAL.test(left.trim()) &&
    DECIMAL.test(right.trim()) &&
    Number.isFinite(first) &&
    Number.isFinite(second)
    ? first - second
    : collator.compare(left, right)
}

export const useTableView = (options: TableViewOptions) => {
  const data = createMemo(
    () =>
      options.data?.() ??
      parseDelimitedText({
        delimiter: options.delimiter?.() ?? ',',
        source: options.source?.() ?? '',
      }),
  )
  const [header, setHeader] = createSignal(options.initialHeader?.() ?? true)
  const [query, setQuery] = createSignal('')
  const [sort, setSort] = createSignal<TableSort | null>(null)
  const [page, setPage] = createSignal(1)
  createEffect(() => {
    data()
    batch(() => {
      setHeader(options.initialHeader?.() ?? true)
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
            ? parsed.rows[0]?.[index] || `열 ${index + 1}`
            : (parsed.columnNames?.[index] ?? `열 ${index + 1}`),
        )
      : []
  })
  const records = createMemo(() => {
    const parsed = data()
    if (!parsed.ok) {
      return []
    }
    const text = query().toLocaleLowerCase()
    const rows = parsed.rows.slice(header() ? 1 : 0)
    const filtered =
      text === ''
        ? rows
        : rows.filter((row) => row.some((cell) => cell.toLocaleLowerCase().includes(text)))
    const ordering = sort()
    return ordering === null
      ? filtered
      : filtered.toSorted(
          (left, right) =>
            compareCells(left[ordering.column] ?? '', right[ordering.column] ?? '') *
            (ordering.descending ? -1 : 1),
        )
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
