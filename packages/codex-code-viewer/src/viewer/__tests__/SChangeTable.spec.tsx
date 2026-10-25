/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {SChangeTable} from '../SChangeTable'
import type {ChangeRow} from '../types'
import {findText} from '../find-text'

afterEach(cleanup)
it('should bound mounted rows while preserving the complete comparison and destinations', async () => {
  const rows: ChangeRow[] = Array.from({length: 2000}, (_, index) => ({
    current: null,
    kind: 'deleted',
    previous: index + 1,
    text: `// row ${index}`,
  }))
  const source = rows.map((row) => row.text).join('\n')
  const [request, setRequest] = createSignal(0)
  render(() => (
    <SChangeTable
      rows={rows}
      path="large.ts"
      matches={findText(source, 'row 1999')}
      activeMatch={0}
      searchScrollRequest={request()}
    />
  ))
  const table = screen.getByRole('table', {name: '변경 내용 비교'})
  expect(table).toHaveAttribute('aria-rowcount', '2000')
  expect(within(table).getAllByRole('row').length).toBeLessThan(60)
  expect(within(table).queryByText('row 1999')).toBeNull()
  setRequest(1)
  await Promise.resolve()
  expect(within(table).getByText('row 1999')).toBeVisible()
  expect(within(table).getAllByRole('row').length).toBeLessThan(60)
  table.scrollTop = 0
  fireEvent.scroll(table)
  expect(within(table).getAllByRole('row')[0]).toHaveAttribute('aria-rowindex', '1')
})
it('should retain the encountered horizontal extent when the virtual window changes', () => {
  const rows: ChangeRow[] = Array.from({length: 2000}, (_, index) => ({
    current: null,
    kind: 'deleted',
    previous: index + 1,
    text: `// row ${index}`,
  }))
  render(() => <SChangeTable rows={rows} path="large.ts" />)
  const table = screen.getByRole('table', {name: '변경 내용 비교'})
  Object.defineProperty(table, 'scrollWidth', {configurable: true, value: 2400})
  table.scrollTop = 24000
  fireEvent.scroll(table)
  expect(table.style.getPropertyValue('--change-width')).toBe('2400px')
  expect(within(table).getAllByRole('row').length).toBeLessThan(60)
  expect(within(table).getAllByRole('row')[0]).toHaveAttribute('aria-rowindex', '991')
})
