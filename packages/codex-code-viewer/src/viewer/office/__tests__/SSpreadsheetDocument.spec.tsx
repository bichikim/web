/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SSpreadsheetDocument} from '../SSpreadsheetDocument'
import type {SpreadsheetSheet} from '../types'

const sheets: readonly SpreadsheetSheet[] = [
  {
    columnNames: ['A', 'B'],
    columns: 2,
    name: '매출',
    ok: true,
    rows: [
      ['항목', '금액'],
      ['한글', '20'],
      ['자료', '10'],
    ],
    truncated: false,
  },
  {
    columnNames: ['A'],
    columns: 1,
    name: '메모',
    ok: true,
    rows: [['<script>내용</script>']],
    truncated: false,
  },
  {columns: 0, name: '빈시트', ok: true, rows: [], truncated: false},
]
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
describe('SSpreadsheetDocument', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    for (const [name, descriptor] of [
      ['showPopover', originalPopover],
      ['scrollIntoView', originalScroll],
    ] as const) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, name)
      } else {
        Object.defineProperty(HTMLElement.prototype, name, descriptor)
      }
    }
  })
  it('should keep the first row as data and switch sheets without retaining filters', () => {
    render(() => <SSpreadsheetDocument sheets={sheets} />)
    expect(screen.getByRole('cell', {name: '항목'})).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(false)
    fireEvent.input(screen.getByRole('textbox', {name: '행 필터링'}), {target: {value: '한글'}})
    expect(screen.queryByRole('cell', {name: '자료'})).toBeNull()
    fireEvent.click(screen.getByRole('combobox', {name: '시트 선택'}))
    fireEvent.click(screen.getByRole('option', {name: '메모'}))
    expect(screen.getByRole('cell', {name: '<script>내용</script>'})).toBeTruthy()
    expect(screen.getByRole('table').querySelector('script')).toBeNull()
    fireEvent.click(screen.getByRole('combobox', {name: '시트 선택'}))
    fireEvent.click(screen.getByRole('option', {name: '빈시트'}))
    expect(screen.getByRole('status').textContent).toContain('표시할 행이 없습니다')
  })
  it('should reuse column sorting and first-row headers for worksheets', () => {
    render(() => <SSpreadsheetDocument sheets={sheets} />)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', {name: '금액 정렬'}))
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '자료',
      '10',
      '한글',
      '20',
    ])
  })
  it('should disclose truncation without offering a nonexistent source view', () => {
    render(() => <SSpreadsheetDocument sheets={[{...sheets[0], truncated: true}]} />)
    expect(screen.getByText(/처음 10,000행·100열/u).textContent).not.toContain('원문')
  })
})
