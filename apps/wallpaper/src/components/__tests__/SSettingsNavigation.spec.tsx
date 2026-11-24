/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createResource, createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest'
import {type SettingsPage, SSettingsNavigation} from '../SSettingsNavigation'

afterEach(cleanup)
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
const selectPage = (name: string) => {
  fireEvent.click(screen.getByRole('combobox', {name: '설정 화면 선택'}))
  fireEvent.click(screen.getByRole('option', {name}))
}

test('should use only header navigation and keep it outside the scrolling content', async () => {
  const [page, setPage] = createSignal<SettingsPage>('background')
  render(() => (
    <SSettingsNavigation value={page()} onChange={setPage}>
      {(page) => <button>{page} content</button>}
    </SSettingsNavigation>
  ))
  const navigation = screen.getByRole('navigation', {name: '위젯 설정 경로'})
  expect(screen.queryByRole('navigation', {name: '설정 화면'})).toBeNull()
  expect(screen.getByRole('region', {name: '배경 설정 내용'}).contains(navigation)).toBe(false)
  expect(screen.getAllByRole('navigation')).toHaveLength(1)
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('배경')
  selectPage('위젯')
  await screen.findByText('widget content')
  expect(screen.getByRole('region', {name: '위젯 설정'})).toHaveTextContent('widget content')
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('위젯')
  expect(screen.queryByRole('region', {name: '배경 설정'})).toBeNull()
  expect(screen.getAllByRole('combobox', {name: '설정 화면 선택'})).toHaveLength(1)
})
test('should navigate locally without requiring controlled state', async () => {
  render(() => <SSettingsNavigation>{(page) => page}</SSettingsNavigation>)
  selectPage('일반')
  await screen.findByText('general')
  expect(screen.getByRole('region', {name: '일반 설정'})).toHaveTextContent('general')
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('일반')
})
test('should follow the controlled page and report navigation changes', async () => {
  const [page, setPage] = createSignal<SettingsPage>('background')
  render(() => (
    <SSettingsNavigation value={page()} onChange={setPage}>
      {(page) => page}
    </SSettingsNavigation>
  ))
  selectPage('위젯')
  await screen.findByRole('region', {name: '위젯 설정'})
  await waitFor(() =>
    expect(screen.getByRole('region', {name: '위젯 설정 내용'})).toHaveAttribute(
      'aria-busy',
      'false',
    ),
  )
  expect(page()).toBe('widget')
  setPage('interaction')
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('조작')
  expect(screen.getByRole('region', {name: '조작 설정'})).toHaveTextContent('interaction')
})

test('should update the header immediately and commit content in a transition', async () => {
  const changes = vi.fn()
  render(() => (
    <SSettingsNavigation onChange={changes}>
      {(page) => <span>{page} content</span>}
    </SSettingsNavigation>
  ))
  selectPage('위젯')
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('위젯')
  expect(changes).not.toHaveBeenCalled()
  expect(screen.getByLabelText('위젯 설정 내용')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByLabelText('위젯 설정 내용')).toHaveProperty('inert', true)
  expect(screen.getByLabelText('위젯 설정 내용').closest('[aria-hidden="true"]')).toHaveClass(
    'opacity-0',
  )
  expect(screen.getByRole('status', {name: '페이지 전환 중'})).toBeInTheDocument()
  expect(screen.getByText('background content')).toBeInTheDocument()
  expect(await screen.findByText('widget content')).toBeInTheDocument()
  expect(changes).toHaveBeenCalledExactlyOnceWith('widget')
})

test('should commit only the last page when the header is changed repeatedly before rendering', async () => {
  const changes = vi.fn()
  render(() => (
    <SSettingsNavigation onChange={changes}>
      {(page) => <span>{page} content</span>}
    </SSettingsNavigation>
  ))
  selectPage('위젯')
  selectPage('일반')
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('일반')
  expect(await screen.findByText('general content')).toBeInTheDocument()
  expect(changes).toHaveBeenCalledExactlyOnceWith('general')
  expect(screen.queryByText('widget content')).toBeNull()
})

const SlowPage = (props: {ready: Promise<string>}) => {
  const [content] = createResource(() => props.ready)
  return <p>{content()}</p>
}

test('should keep the requested header responsive while page data is unresolved', async () => {
  const ready = Promise.withResolvers<string>()
  render(() => (
    <SSettingsNavigation>
      {(page) => (page === 'widget' ? <SlowPage ready={ready.promise} /> : <p>background ready</p>)}
    </SSettingsNavigation>
  ))
  selectPage('위젯')
  await Promise.resolve()
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('위젯')
  expect(screen.getByText('background ready')).toBeInTheDocument()
  expect(screen.getByLabelText('위젯 설정 내용')).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByLabelText('위젯 설정 내용').closest('[aria-hidden="true"]')).toHaveClass(
    'opacity-0',
  )
  expect(screen.getByRole('status', {name: '페이지 전환 중'})).toBeInTheDocument()
  ready.resolve('widget ready')
  expect(await screen.findByText('widget ready')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('region', {name: '위젯 설정 내용'})).toHaveAttribute(
      'aria-busy',
      'false',
    ),
  )
})
