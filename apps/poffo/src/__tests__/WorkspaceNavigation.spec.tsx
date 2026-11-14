/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {WorkspaceNavigation} from '../WorkspaceNavigation'
const frames = new Map<number, FrameRequestCallback>()
let frameId = 0
const paint = () => {
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach((callback) => callback(0))
}
beforeEach(() => {
  frames.clear()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/')
})
test.each(['studio', 'viewer'] as const)(
  'should preserve runtime queries and mark %s as the current page',
  (current) => {
    render(() => <WorkspaceNavigation current={current} search="?session=working&motion=idle" />)
    const navigation = within(screen.getByRole('navigation', {name: '작업 공간 이동'}))
    expect(navigation.getByRole('link', {name: 'Editor'})).toHaveAttribute(
      'href',
      '/editor?session=working&motion=idle',
    )
    expect(navigation.getByRole('link', {name: 'Studio'})).toHaveAttribute(
      'href',
      '/studio?session=working&motion=idle',
    )
    expect(navigation.getByRole('link', {name: 'Viewer'})).toHaveAttribute(
      'href',
      '/viewer?session=working&motion=idle',
    )
    expect(navigation.getByRole('link', {current: 'page'})).toHaveTextContent(
      current === 'studio' ? 'Studio' : 'Viewer',
    )
    expect(navigation.getByRole('link', {current: 'page'})).toHaveAttribute('data-selected')
  },
)
test('should open the current editor work through the provided launch actions', () => {
  const onStudioOpen = vi.fn()
  const onViewerOpen = vi.fn()
  render(() => (
    <WorkspaceNavigation current="editor" onStudioOpen={onStudioOpen} onViewerOpen={onViewerOpen} />
  ))
  const navigation = within(screen.getByRole('navigation', {name: '작업 공간 이동'}))
  expect(navigation.getByRole('link', {name: 'Editor'})).toHaveAttribute('aria-current', 'page')
  fireEvent.click(navigation.getByRole('button', {name: 'Studio'}))
  paint()
  paint()
  fireEvent.click(navigation.getByRole('button', {name: 'Viewer'}))
  paint()
  paint()
  expect(onStudioOpen).toHaveBeenCalledOnce()
  expect(onViewerOpen).toHaveBeenCalledOnce()
})
test('should disable editor destinations without a launch action', () => {
  render(() => <WorkspaceNavigation current="editor" />)
  expect(screen.getByRole('button', {name: 'Studio'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Viewer'})).toBeDisabled()
})

test('should switch runtime workspaces through history without a page navigation', () => {
  render(() => <WorkspaceNavigation current="viewer" search="?session=ren&motion=TapBody%3A0" />)
  const navigation = within(screen.getByRole('navigation', {name: '작업 공간 이동'}))
  fireEvent.click(navigation.getByRole('link', {name: 'Studio'}))
  paint()
  paint()
  expect(location.pathname).toBe('/studio')
  expect(new URLSearchParams(location.search).get('session')).toBe('ren')
  fireEvent.click(navigation.getByRole('link', {name: 'Editor'}))
  paint()
  paint()
  expect(location.pathname).toBe('/editor')
  expect(new URLSearchParams(location.search).get('motion')).toBe('TapBody:0')
})

test('should retain the shared document query when selecting the active editor link', () => {
  history.replaceState(null, '', '/editor?session=ren&motion=TapBody%3A0')
  render(() => <WorkspaceNavigation current="editor" />)
  fireEvent.click(screen.getByRole('link', {name: 'Editor'}))
  expect(new URLSearchParams(location.search).get('session')).toBe('ren')
  expect(new URLSearchParams(location.search).get('motion')).toBe('TapBody:0')
})

test('should select the destination before painting and starting an editor handoff', () => {
  const open = vi.fn()
  render(() => <WorkspaceNavigation current="editor" onStudioOpen={open} />)
  const studio = screen.getByRole('button', {name: 'Studio'})
  fireEvent.click(studio)
  expect(studio).toHaveAttribute('data-selected')
  expect(studio).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('link', {name: 'Editor'})).not.toHaveAttribute('data-selected')
  expect(open).not.toHaveBeenCalled()
  paint()
  expect(open).not.toHaveBeenCalled()
  paint()
  expect(open).toHaveBeenCalledOnce()
})

test('should select a runtime destination before changing history and coalesce repeated choices', () => {
  history.replaceState(null, '', '/viewer?session=model')
  render(() => <WorkspaceNavigation current="viewer" search="?session=model" />)
  const studio = screen.getByRole('link', {name: 'Studio'})
  fireEvent.click(studio)
  expect(studio).toHaveAttribute('data-selected')
  expect(location.pathname).toBe('/viewer')
  paint()
  expect(location.pathname).toBe('/viewer')
  fireEvent.click(screen.getByRole('link', {name: 'Editor'}))
  paint()
  paint()
  expect(location.pathname).toBe('/editor')
})

test('should cancel an editor handoff when the active screen is selected again', async () => {
  let finish = () => {}
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const open = vi.fn((_signal?: AbortSignal) => pending)
  render(() => <WorkspaceNavigation current="editor" onStudioOpen={open} />)
  fireEvent.click(screen.getByRole('button', {name: 'Studio'}))
  paint()
  paint()
  const signal = open.mock.calls[0]![0]!
  fireEvent.click(screen.getByRole('link', {name: 'Editor'}))
  expect(signal.aborted).toBe(true)
  expect(screen.getByRole('link', {name: 'Editor'})).toHaveAttribute('data-selected')
  finish()
  await pending
})

test('should show a launch failure and restore the active selection', async () => {
  let fail = (_cause: Error) => {}
  const pending = new Promise<void>((_resolve, reject) => {
    fail = reject
  })
  render(() => <WorkspaceNavigation current="editor" onViewerOpen={() => pending} />)
  fireEvent.click(screen.getByRole('button', {name: 'Viewer'}))
  paint()
  paint()
  fail(new Error('storage unavailable'))
  expect(await screen.findByRole('alert')).toHaveTextContent('storage unavailable')
  expect(screen.getByRole('link', {name: 'Editor'})).toHaveAttribute('data-selected')
})

test('should cancel a deferred navigation when browser history changes externally', () => {
  const [current, setCurrent] = createSignal<'studio' | 'viewer'>('viewer')
  history.replaceState(null, '', '/viewer')
  render(() => <WorkspaceNavigation current={current()} />)
  fireEvent.click(screen.getByRole('link', {name: 'Editor'}))
  setCurrent('studio')
  paint()
  paint()
  expect(screen.getByRole('link', {name: 'Studio'})).toHaveAttribute('data-selected')
  expect(location.pathname).toBe('/viewer')
})

test('should preserve modified link clicks without selecting or scheduling a navigation', () => {
  render(() => <WorkspaceNavigation current="viewer" />)
  fireEvent.click(screen.getByRole('link', {name: 'Studio'}), {ctrlKey: true})
  expect(screen.getByRole('link', {name: 'Viewer'})).toHaveAttribute('data-selected')
  expect(frames.size).toBe(0)
})

test('should retain the latest selection when a superseded asynchronous handoff completes', async () => {
  let finish = () => {}
  const previous = new Promise<void>((resolve) => {
    finish = resolve
  })
  const openStudio = vi.fn((_signal?: AbortSignal) => previous)
  const openViewer = vi.fn(() => new Promise<void>(() => {}))
  render(() => (
    <WorkspaceNavigation current="editor" onStudioOpen={openStudio} onViewerOpen={openViewer} />
  ))
  fireEvent.click(screen.getByRole('button', {name: 'Studio'}))
  paint()
  paint()
  fireEvent.click(screen.getByRole('button', {name: 'Viewer'}))
  expect(openStudio.mock.calls[0]![0]!.aborted).toBe(true)
  paint()
  paint()
  finish()
  await previous
  expect(screen.getByRole('button', {name: 'Viewer'})).toHaveAttribute('data-selected')
  expect(openViewer).toHaveBeenCalledOnce()
})

test('should discard a deferred choice when the navigation is unmounted', () => {
  const open = vi.fn()
  const view = render(() => <WorkspaceNavigation current="editor" onStudioOpen={open} />)
  fireEvent.click(screen.getByRole('button', {name: 'Studio'}))
  view.unmount()
  paint()
  paint()
  expect(open).not.toHaveBeenCalled()
})

test('should paint a repeated destination again when an earlier handoff is still saving', () => {
  const open = vi.fn(() => new Promise<void>(() => {}))
  render(() => <WorkspaceNavigation current="editor" onStudioOpen={open} onViewerOpen={open} />)
  fireEvent.click(screen.getByRole('button', {name: 'Studio'}))
  paint()
  paint()
  expect(open).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: 'Viewer'}))
  fireEvent.click(screen.getByRole('button', {name: 'Studio'}))
  expect(screen.getByRole('button', {name: 'Studio'})).toHaveAttribute('data-selected')
  expect(open).toHaveBeenCalledOnce()
  paint()
  expect(open).toHaveBeenCalledOnce()
  paint()
  expect(open).toHaveBeenCalledTimes(2)
})
