/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test} from 'vitest'
import {type SettingsPage, SSettingsNavigation} from '../SSettingsNavigation'

afterEach(cleanup)
test('should identify the current settings page and keep navigation outside its content', () => {
  const [page, setPage] = createSignal<SettingsPage>('background')
  render(() => (
    <SSettingsNavigation value={page()} onChange={setPage}>
      {(page) => <button>{page} content</button>}
    </SSettingsNavigation>
  ))
  const navigation = screen.getByRole('navigation', {name: '설정 화면'})
  const panel = screen.getByRole('region', {name: '배경 설정'})
  expect(panel.contains(navigation)).toBe(false)
  expect(screen.getByRole('button', {current: 'page', name: '배경'})).toBeInTheDocument()
  expect(screen.getByRole('heading', {level: 2, name: '배경'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '위젯'}))
  expect(screen.getByRole('region', {name: '위젯 설정'})).toHaveTextContent('widget content')
  expect(screen.getByRole('heading', {level: 2, name: '위젯'})).toBeInTheDocument()
  expect(screen.queryByRole('region', {name: '배경 설정'})).toBeNull()
  expect(screen.getAllByRole('button', {current: 'page'})).toHaveLength(1)
})
test('should navigate locally without requiring controlled state', () => {
  render(() => <SSettingsNavigation>{(page) => page}</SSettingsNavigation>)
  fireEvent.click(screen.getByRole('button', {name: '일반'}))
  expect(screen.getByRole('region', {name: '일반 설정'})).toHaveTextContent('general')
  expect(screen.getByRole('button', {current: 'page', name: '일반'})).toBeInTheDocument()
})
test('should follow the controlled page and report navigation changes', () => {
  const [page, setPage] = createSignal<SettingsPage>('background')
  render(() => (
    <SSettingsNavigation value={page()} onChange={setPage}>
      {(page) => page}
    </SSettingsNavigation>
  ))
  fireEvent.click(screen.getByRole('button', {name: '위젯'}))
  expect(page()).toBe('widget')
  setPage('interaction')
  expect(screen.getByRole('button', {current: 'page', name: '조작'})).toBeInTheDocument()
  expect(screen.getByRole('region', {name: '조작 설정'})).toHaveTextContent('interaction')
})
