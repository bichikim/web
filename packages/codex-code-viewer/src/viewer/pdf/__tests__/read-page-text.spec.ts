import {describe, expect, it} from 'vitest'
import {readPageText} from '../read-page-text'

const item = {
  dir: 'ltr',
  fontName: 'font',
  hasEOL: true,
  height: 20,
  str: 'abc',
  transform: [20, 0, 0, 20, 10, 20],
  width: 60,
}
const content = {
  items: [item],
  styles: {font: {ascent: 0.8, fontFamily: 'sans-serif', vertical: false}},
}
describe('readPageText', () => {
  it('should place text over an unrotated PDF baseline and retain searchable offsets', () => {
    const result = readPageText(content, [1, 0, 0, -1, 0, 100])
    expect(result.source).toBe('abc\n')
    expect(result.runs[0]).toEqual({
      angle: 0,
      direction: 'ltr',
      font: 'sans-serif',
      height: 20,
      lineBreak: true,
      offset: 0,
      text: 'abc',
      width: 60,
      x: 10,
      y: 64,
    })
  })
  it('should preserve rotated and vertical text positions', () => {
    const result = readPageText(content, [0, 1, 1, 0, 0, 0])
    expect(result.runs[0].angle).toBeCloseTo(Math.PI / 2)
    expect(result.runs[0].x).toBeCloseTo(36)
    expect(result.runs[0].y).toBeCloseTo(10)
    const vertical = readPageText(
      {...content, styles: {font: {...content.styles.font, vertical: true}}},
      [1, 0, 0, -1, 0, 100],
    )
    expect(vertical.runs[0].width).toBe(20)
    expect(vertical.runs[0].angle).toBeCloseTo(Math.PI / 2)
  })
  it('should scale horizontal and vertical glyph widths with the PDF page user unit', () => {
    const horizontal = readPageText(content, [2, 0, 0, -2, 0, 200])
    expect(horizontal.runs[0].height).toBe(40)
    expect(horizontal.runs[0].width).toBe(120)
    const vertical = readPageText(
      {...content, styles: {font: {...content.styles.font, vertical: true}}},
      [0, 2, 2, 0, 0, 0],
    )
    expect(vertical.runs[0].height).toBe(40)
    expect(vertical.runs[0].width).toBe(40)
  })
  it('should skip metadata and retain multiline offsets with a fallback font', () => {
    const result = readPageText(
      {
        items: [item, {type: 'begin'}, {...item, fontName: 'missing', str: 'def'}],
        styles: content.styles,
      },
      [1, 0, 0, -1, 0, 100],
    )
    expect(result.runs.map((run) => run.offset)).toEqual([0, 4])
    expect(result.runs[1].font).toBe('sans-serif')
    expect(result.source).toBe('abc\ndef\n')
  })
})
