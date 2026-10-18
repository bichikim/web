import {selectTableRows} from '../../../src/headless/index.ts'
let sheets = []
let sheetIndex = 0
let preview
let header = true
let page = 0
let query = ''
let sort = null
/** Loads draft table text through the existing parser and resets presentation choices. */
export async function openTable(request, document) {
  resetTable(true)
  sheets = []
  preview = await request('code.preview', {
    delimiter: document.path.endsWith('.tsv') ? '\t' : ',',
    source: document.source,
  })
}
function resetTable(hasHeader) {
  query = ''
  sort = null
  page = 0
  header = hasHeader
}
/** Shares native table operations with the existing spreadsheet parser's worksheets. */
export function openSpreadsheet(document) {
  ;({sheets} = document)
  sheetIndex = 0
  ;[preview] = sheets
  resetTable(false)
}
export function changeTable(command) {
  switch (command.kind) {
    case 'tableSheet': {
      const index = Number(command.value)
      if (Number.isInteger(index) && sheets[index] !== undefined) {
        sheetIndex = index
        preview = sheets[index]
        resetTable(false)
      }
      return true
    }
    case 'tableHeader':
      header = !header
      sort = null
      page = 0
      return true
    case 'tablePage':
      page = Math.max(0, page + command.delta)
      return true
    case 'tableQuery':
      query = command.value
      page = 0
      return true
    case 'tableSort':
      sort =
        command.column < 0
          ? null
          : {
              column: command.column,
              descending: sort?.column === command.column && !sort.descending,
            }
      page = 0
      return true
    default:
      return false
  }
}
export function tableView() {
  return {
    tableHeader: header,
    tablePage: page,
    tablePreview: preview,
    tableQuery: query,
    tableRows: preview?.ok ? selectTableRows({header, query, rows: preview.rows, sort}) : [],
    tableSheet: sheetIndex,
    tableSheets: sheets.map((sheet) => sheet.name),
    tableSort: sort,
  }
}
