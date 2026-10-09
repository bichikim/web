import {read, utils, type WorkSheet} from 'xlsx'
import type {SpreadsheetResult, SpreadsheetSheet} from './types'

const MAX_ROWS = 10000
const MAX_COLUMNS = 100
const ZIP_SIGNATURE = Uint8Array.from('PK\x03\x04', (character) => character.charCodeAt(0))

const cellText = (sheet: WorkSheet, row: number, column: number): string => {
  const cell = sheet[`${utils.encode_col(column)}${row + 1}`]
  return cell === undefined
    ? ''
    : (cell.w ??
        (cell.f !== undefined && cell.v === undefined ? `=${cell.f}` : utils.format_cell(cell)))
}
const readSheet = (name: string, sheet: WorkSheet): SpreadsheetSheet => {
  const reference = sheet['!fullref'] ?? sheet['!ref']
  if (reference === undefined) {
    return {columnNames: [], columns: 0, name, ok: true, rows: [], truncated: false}
  }
  const range = utils.decode_range(reference)
  const rowCount = Math.min(MAX_ROWS, range.e.r + 1)
  const columns = Math.min(MAX_COLUMNS, range.e.c + 1)
  return {
    columnNames: Array.from({length: columns}, (_, column) => utils.encode_col(column)),
    columns,
    name,
    ok: true,
    rows: Array.from({length: rowCount}, (_, row) =>
      Array.from({length: columns}, (_, column) => cellText(sheet, row, column)),
    ),
    truncated: range.e.r >= MAX_ROWS || range.e.c >= MAX_COLUMNS,
  }
}

/** Reads XLSX worksheets as bounded text tables without evaluating formulas. */
export const parseSpreadsheet = (bytes: ArrayBuffer): SpreadsheetResult => {
  try {
    const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, ZIP_SIGNATURE.length))
    if (!ZIP_SIGNATURE.every((byte, index) => signature[index] === byte)) {
      return {message: 'XLSX 파일을 읽을 수 없습니다. 파일 형식을 확인해 주세요.', ok: false}
    }
    const workbook = read(new Uint8Array(bytes), {
      bookVBA: false,
      cellFormula: true,
      cellHTML: false,
      sheetRows: MAX_ROWS,
      type: 'array',
    })
    if (workbook.SheetNames.length === 0) {
      return {message: '표시할 시트가 없습니다.', ok: false}
    }
    return {
      ok: true,
      sheets: workbook.SheetNames.map((name) => readSheet(name, workbook.Sheets[name])),
    }
  } catch {
    return {
      message: '엑셀 파일을 읽을 수 없습니다. 손상되었거나 암호화된 파일인지 확인해 주세요.',
      ok: false,
    }
  }
}
