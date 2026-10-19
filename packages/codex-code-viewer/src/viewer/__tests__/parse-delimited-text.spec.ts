import {describe, expect, it} from 'vitest'
import {parseDelimitedText} from '../parse-delimited-text'

describe('parseDelimitedText', () => {
  it('should preserve quoted commas, escaped quotes, empty cells and embedded CRLF', () => {
    expect(
      parseDelimitedText({
        delimiter: ',',
        source: '\uFEFFname,note,last\r\n한글,"a,b\r\n""quote""",\r\n',
      }),
    ).toEqual({
      columns: 3,
      ok: true,
      rows: [
        ['name', 'note', 'last'],
        ['한글', 'a,b\r\n"quote"', ''],
      ],
      truncated: false,
    })
  })
  it('should parse TSV tabs and uneven records without losing cells', () => {
    expect(parseDelimitedText({delimiter: '\t', source: 'one\ttwo\n1\t2\t3\n4\n'})).toMatchObject({
      columns: 3,
      ok: true,
      rows: [['one', 'two'], ['1', '2', '3'], ['4']],
      truncated: false,
    })
  })
  it('should report malformed quoting instead of returning misleading rows', () => {
    expect(parseDelimitedText({delimiter: ',', source: 'name,note\n1,"unfinished'})).toMatchObject({
      ok: false,
    })
  })
  it('should represent empty files without inventing a header', () => {
    expect(parseDelimitedText({delimiter: ',', source: ''})).toEqual({
      columns: 0,
      ok: true,
      rows: [],
      truncated: false,
    })
  })
  it('should bound the table preview and mark omitted rows and columns', () => {
    const rows = Array.from({length: 10002}, () => 'a,b').join('\n')
    const result = parseDelimitedText({delimiter: ',', source: rows})
    expect(result).toMatchObject({ok: true, truncated: true})
    if (result.ok) {
      expect(result.rows).toHaveLength(10000)
    }
    expect(
      parseDelimitedText({delimiter: ',', source: Array.from({length: 101}, () => 'a').join(',')}),
    ).toMatchObject({columns: 100, ok: true, truncated: true})
  })
})
