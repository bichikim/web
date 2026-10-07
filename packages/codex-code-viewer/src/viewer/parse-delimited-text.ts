import {parse} from 'csv-parse/browser/esm/sync'

interface DelimitedTextOptions {
  readonly source: string
  readonly delimiter: ',' | '\t'
}
interface TableData {
  readonly ok: true
  readonly rows: readonly (readonly string[])[]
  readonly columns: number
  readonly truncated: boolean
}
interface TableError {
  readonly ok: false
  readonly message: string
}
const MAX_ROWS = 10000
const MAX_COLUMNS = 100

/** Parses quoted CSV/TSV into a bounded preview, preserving cell text without evaluation. */
export const parseDelimitedText = (options: DelimitedTextOptions): TableData | TableError => {
  try {
    const records = parse(options.source, {
      bom: true,
      delimiter: options.delimiter,
      relaxColumnCount: true,
      skipEmptyLines: true,
      to: MAX_ROWS + 1,
    })
    const rows = records.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLUMNS))
    return {
      columns: rows.reduce((maximum, row) => Math.max(maximum, row.length), 0),
      ok: true,
      rows,
      truncated: records.length > MAX_ROWS || records.some((row) => row.length > MAX_COLUMNS),
    }
  } catch {
    return {
      message: '표를 읽을 수 없습니다. 구분 문자와 인용부호를 원문에서 확인해 주세요.',
      ok: false,
    }
  }
}
