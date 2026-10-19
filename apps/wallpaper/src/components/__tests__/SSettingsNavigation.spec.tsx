/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {type SettingsPage, SSettingsNavigation} from '../SSettingsNavigation'

afterEach(cleanup)
test('should expose one selected tab and associated panel while keeping navigation outside panel content', () => {
  const [page, setPage] = createSignal<SettingsPage>('background')
  render(() => (
    <SSettingsNavigation value={page()} onChange={setPage}>
      {(page) => <button>{page} content</button>}
    </SSettingsNavigation>
  ))
  const tabs = screen.getByRole('tablist', {name: '설정 화면'})
  const panel = screen.getByRole('tabpanel', {name: '배경'})
  expect(panel.contains(tabs)).toBe(false)
  expect(
    screen.getByRole('tab', {name: '배경', selected: true}).getAttribute('aria-controls'),
  ).toBe(panel.id)
  fireEvent.click(screen.getByRole('tab', {name: '위젯'}))
  expect(screen.getByRole('tabpanel', {name: '위젯'}).textContent).toBe('widget content')
  expect(screen.queryByRole('tabpanel', {name: '배경'})).toBeNull()
})
test('should move focus using arrow and boundary keys and activate explicitly', () => {
  const [page, setPage] = createSignal<SettingsPage>('background')
  render(() => (
    <SSettingsNavigation value={page()} onChange={setPage}>
      {(page) => page}
    </SSettingsNavigation>
  ))
  const background = screen.getByRole('tab', {name: '배경'})
  background.focus()
  fireEvent.keyDown(background, {key: 'ArrowRight'})
  expect(document.activeElement).toBe(screen.getByRole('tab', {name: '위젯'}))
  expect(page()).toBe('background')
  fireEvent.click(document.activeElement!)
  expect(page()).toBe('widget')
  fireEvent.keyDown(screen.getByRole('tab', {name: '위젯'}), {key: 'End'})
  expect(document.activeElement).toBe(screen.getByRole('tab', {name: '일반'}))
  fireEvent.keyDown(document.activeElement!, {key: 'Home'})
  expect(document.activeElement).toBe(background)
})
