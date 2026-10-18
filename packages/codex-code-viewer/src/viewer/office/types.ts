import type {TableData} from '../table/types'

export interface DocumentText {
  readonly kind: 'text'
  readonly text: string
}
export interface DocumentElement {
  readonly kind: 'element'
  readonly tag: string
  readonly children: readonly DocumentNode[]
  readonly href?: string
  readonly id?: string
  readonly src?: string
  readonly alt?: string
  readonly colspan?: number
  readonly rowspan?: number
}
export type DocumentNode = DocumentText | DocumentElement
export interface WordDocument {
  readonly ok: true
  readonly nodes: readonly DocumentNode[]
  readonly warnings: readonly string[]
}
export interface SpreadsheetSheet extends TableData {
  readonly name: string
}
export interface SpreadsheetDocument {
  readonly ok: true
  readonly sheets: readonly SpreadsheetSheet[]
}
export interface OfficeError {
  readonly ok: false
  readonly message: string
}
export type WordResult = WordDocument | OfficeError
export type SpreadsheetResult = SpreadsheetDocument | OfficeError
