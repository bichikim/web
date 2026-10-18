interface TableSort {
  readonly column: number
  readonly descending: boolean
}
interface TableRowsOptions {
  readonly rows: readonly (readonly string[])[]
  readonly header: boolean
  readonly query: string
  readonly sort: TableSort | null
}
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

/** Filters literal cell text and orders numeric/text columns without modifying source data. */
export const selectTableRows = (options: TableRowsOptions): readonly (readonly string[])[] => {
  const text = options.query.toLocaleLowerCase()
  const rows = options.rows.slice(options.header ? 1 : 0)
  const filtered =
    text === ''
      ? rows
      : rows.filter((row) => row.some((cell) => cell.toLocaleLowerCase().includes(text)))
  const ordering = options.sort
  return ordering === null
    ? filtered
    : filtered.toSorted(
        (left, right) =>
          compareCells(left[ordering.column] ?? '', right[ordering.column] ?? '') *
          (ordering.descending ? -1 : 1),
      )
}
