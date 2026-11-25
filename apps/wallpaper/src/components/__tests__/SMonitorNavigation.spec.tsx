/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import {SMonitorNavigation} from '../SMonitorNavigation'
import {SSettingsNavigation} from '../SSettingsNavigation'
import type {WallpaperMonitor} from '../../features/settings/monitors'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterEach(cleanup)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
const screens: readonly WallpaperMonitor[] = [
  {id: 'first', name: 'Built-in display'},
  {id: 'second', name: 'External display'},
]

test('should switch the selected background from its header and reset content scroll', async () => {
  const [selected, setSelected] = createSignal<string | null>('first')
  const select = vi.fn((id: string) => setSelected(id))
  render(() => (
    <SSettingsNavigation>
      {() => (
        <SMonitorNavigation
          controller={{monitors: () => screens, selectedId: selected, selectMonitor: select}}
        >
          <output aria-label="편집할 화면">{selected()}</output>
        </SMonitorNavigation>
      )}
    </SSettingsNavigation>
  ))
  const body = screen.getByRole('region', {name: '배경 설정 내용'})
  const field = screen.getByRole('combobox', {name: '화면 선택'})
  expect(body.contains(field)).toBe(false)
  expect(field.closest('header')).not.toBeNull()
  expect(field).toHaveTextContent('화면 1')
  expect(within(body).queryByRole('group', {name: '모니터'})).toBeNull()
  body.scrollTop = 200
  fireEvent.click(field)
  fireEvent.click(screen.getByRole('option', {name: '화면 2'}))
  await waitFor(() => expect(select).toHaveBeenCalledExactlyOnceWith('second'))
  expect(field).toHaveTextContent('화면 2')
  expect(await screen.findByRole('status', {name: '편집할 화면'})).toHaveTextContent('second')
  expect(body.scrollTop).toBe(0)
  fireEvent.click(field)
  fireEvent.click(screen.getByRole('option', {name: '화면 1'}))
  await waitFor(() => expect(select).toHaveBeenLastCalledWith('first'))
  expect(field).toHaveTextContent('화면 1')
  expect(await screen.findByRole('status', {name: '편집할 화면'})).toHaveTextContent('first')
})

test('should refresh display choices when the monitor list changes', () => {
  const [monitors, setMonitors] = createSignal(screens)
  const [selected, setSelected] = createSignal<string | null>('second')
  render(() => (
    <SSettingsNavigation>
      {() => (
        <SMonitorNavigation
          controller={{monitors, selectedId: selected, selectMonitor: setSelected}}
        />
      )}
    </SSettingsNavigation>
  ))
  const field = screen.getByRole('combobox', {name: '화면 선택'})
  expect(field).toHaveTextContent('화면 2')
  setMonitors([screens[1]!])
  expect(field).toHaveTextContent('화면 1')
  fireEvent.click(field)
  expect(screen.getAllByRole('option')).toHaveLength(1)
  expect(screen.getByRole('option', {name: '화면 1'})).toHaveAttribute('aria-selected', 'true')
})

test('should retain the content selector for interaction settings', () => {
  const [selected, setSelected] = createSignal<string | null>('first')
  render(() => (
    <SSettingsNavigation value="interaction">
      {() => (
        <SMonitorNavigation
          placement="content"
          controller={{monitors: () => screens, selectedId: selected, selectMonitor: setSelected}}
        />
      )}
    </SSettingsNavigation>
  ))
  expect(screen.queryByRole('combobox', {name: '화면 선택'})).toBeNull()
  const body = screen.getByRole('region', {name: '조작 설정 내용'})
  fireEvent.click(within(body).getByRole('radio', {name: '화면 2'}))
  expect(selected()).toBe('second')
})
