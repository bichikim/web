/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, describe, expect, it} from 'vitest'
import {STableDocument} from '../STableDocument'

describe('STableDocument', () => {
  afterEach(cleanup)
  it('should order negative and decimal numbers by value', () => {
    render(() => <STableDocument source={'value\n2.1\n-10\n2.05\n-2'} delimiter="," />)
    fireEvent.click(screen.getByRole('button', {name: 'value 정렬'}))
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '-10',
      '-2',
      '2.05',
      '2.1',
    ])
  })
  it('should sort numeric-looking cells, filter rows and retain the filter input', () => {
    render(() => <STableDocument source={'name,amount\nBeta,10\nAlpha,2'} delimiter="," />)
    const table = screen.getByRole('table', {name: '파일 데이터'})
    fireEvent.click(screen.getByRole('button', {name: 'amount 정렬'}))
    expect(within(table).getAllByRole('row')[1].textContent).toContain('Alpha')
    fireEvent.click(screen.getByRole('button', {name: 'amount 정렬'}))
    expect(within(table).getAllByRole('row')[1].textContent).toContain('Beta')
    const filter = screen.getByRole('textbox', {name: '행 필터링'})
    fireEvent.input(filter, {target: {value: 'alpha'}})
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('textbox', {name: '행 필터링'})).toBe(filter)
    fireEvent.click(screen.getByRole('checkbox', {name: '첫 행을 열 이름으로'}))
    fireEvent.input(filter, {target: {value: ''}})
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByRole('cell', {name: 'name'})).toBeTruthy()
  })
  it('should page a long table and reset its page after filtering', () => {
    const source = ['name', ...Array.from({length: 51}, (_, index) => `row${index}`)].join('\n')
    render(() => <STableDocument source={source} delimiter="," />)
    const table = screen.getByRole('table', {name: '파일 데이터'})
    expect(within(table).getAllByRole('row')).toHaveLength(51)
    expect(screen.getByRole<HTMLButtonElement>('button', {name: '이전 표 페이지'}).disabled).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('button', {name: '다음 표 페이지'}))
    expect(within(table).getByRole('cell', {name: 'row50'})).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', {name: '다음 표 페이지'}).disabled).toBe(
      true,
    )
    fireEvent.input(screen.getByRole('textbox', {name: '행 필터링'}), {target: {value: 'row0'}})
    expect(within(table).getByRole('cell', {name: 'row0'})).toBeTruthy()
  })
  it('should render markup and formulas as cell text', () => {
    render(() => (
      <STableDocument source={'value\n<script>alert(1)</script>\n=SUM(A1:A2)'} delimiter="," />
    ))
    const table = screen.getByRole('table')
    expect(table.querySelector('script')).toBeNull()
    expect(within(table).getByRole('cell', {name: '=SUM(A1:A2)'})).toBeTruthy()
  })
})
