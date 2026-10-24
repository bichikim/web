export interface TableData {
  readonly ok: true
  readonly rows: readonly (readonly string[])[]
  readonly columns: number
  readonly truncated: boolean
  readonly columnNames?: readonly string[]
}
export interface TableError {
  readonly ok: false
  readonly message: string
}
export type TableResult = TableData | TableError
