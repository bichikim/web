import {describe, expect, it} from 'vitest'
import {utils, write} from 'xlsx'
import {parseSpreadsheet} from '../parse-spreadsheet'

const workbookBytes = (
  sheets: Record<string, ReturnType<typeof utils.aoa_to_sheet>>,
  names = Object.keys(sheets),
): ArrayBuffer => write({SheetNames: names, Sheets: sheets}, {bookType: 'xlsx', type: 'array'})

describe('parseSpreadsheet', () => {
  it('should preserve sheet order, blanks, formatted values and formula results as text', () => {
    const first = utils.aoa_to_sheet([
      ['이름', '금액'],
      ['한글', 12],
      ['', false],
    ])
    const bytes = workbookBytes(
      {
        메모: utils.aoa_to_sheet([['<script>내용</script>', '=SUM(A1:A2)']]),
        명세: {
          ...first,
          '!ref': 'A1:C3',
          B2: {t: 'n', v: 12, z: '0.00'},
          C2: {f: 'B2*2', t: 'n', v: 24},
        },
        빈시트: {},
      },
      ['명세', '메모', '빈시트'],
    )
    const result = parseSpreadsheet(bytes)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.sheets.map((sheet) => sheet.name)).toEqual(['명세', '메모', '빈시트'])
    expect(result.sheets[0].rows).toEqual([
      ['이름', '금액', ''],
      ['한글', '12.00', '24'],
      ['', 'FALSE', ''],
    ])
    expect(result.sheets[1].rows[0]).toEqual(['<script>내용</script>', '=SUM(A1:A2)'])
    expect(result.sheets[2].rows).toEqual([])
  })
  it('should bound large ranges and report truncation without losing leading blank cells', () => {
    const result = parseSpreadsheet(
      workbookBytes({데이터: {'!ref': 'B2:XFD2', B2: {t: 's', v: '값'}}}),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.sheets[0]).toMatchObject({columns: 100, truncated: true})
    expect(result.sheets[0].rows).toHaveLength(2)
    expect(result.sheets[0].rows[1][1]).toBe('값')
  })
  it('should limit row previews using the original worksheet range', () => {
    const result = parseSpreadsheet(
      workbookBytes({데이터: {'!ref': 'A1:A10001', A1: {t: 's', v: '첫행'}}}),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.sheets[0].rows).toHaveLength(10000)
    expect(result.sheets[0].truncated).toBe(true)
  })
  it('should reject malformed and non-XLSX bytes rather than accepting them as plaintext', () => {
    expect(parseSpreadsheet(new TextEncoder().encode('name,value\na,1').buffer)).toMatchObject({
      ok: false,
    })
    expect(parseSpreadsheet(new Uint8Array([80, 75, 3, 4]).buffer)).toMatchObject({ok: false})
  })
})
