/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {type PSideTabItem, PSideTabs} from '../PSideTabs'

it('should switch sections and follow changes to the available items', () => {
  const [value, setValue] = createSignal('first')
  const [items, setItems] = createSignal<ReadonlyArray<PSideTabItem>>([
    {label: '첫 화면', value: 'first'},
    {icon: 'i-tabler-calendar', label: '둘째 화면', value: 'second'},
  ])
  render(() => (
    <PSideTabs accessibleLabel="화면 선택" items={items()} value={value()} onChange={setValue}>
      <p>{value() === 'first' ? '첫 내용' : '둘째 내용'}</p>
    </PSideTabs>
  ))
  fireEvent.click(screen.getByRole('button', {name: '둘째 화면'}))
  expect(screen.getByText('둘째 내용')).toBeVisible()
  expect(screen.getByRole('button', {name: '둘째 화면'})).toHaveAttribute('aria-current', 'page')
  setItems([{label: '첫 화면', value: 'first'}])
  expect(screen.getByRole('button', {name: '첫 화면'})).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByRole('button', {name: '둘째 화면'})).not.toBeInTheDocument()
})

it('should support headless select changes and empty item lists', async () => {
  const onChange = vi.fn()
  const [items, setItems] = createSignal<ReadonlyArray<PSideTabItem>>([
    {label: '첫 화면', value: 'first'},
    {label: '둘째 화면', value: 'second'},
  ])
  render(() => <PSideTabs accessibleLabel="화면 선택" items={items()} onChange={onChange} />)
  fireEvent.keyDown(screen.getByRole('button', {name: '화면 선택 첫 화면'}), {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: '둘째 화면'}))
  expect(onChange).toHaveBeenCalledWith('second')
  expect(screen.getByRole('button', {name: '둘째 화면'})).toHaveAttribute('aria-current', 'page')
  setItems([])
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
