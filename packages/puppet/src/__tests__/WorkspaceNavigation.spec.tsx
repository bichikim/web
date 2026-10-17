/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {WorkspaceNavigation} from '../WorkspaceNavigation'
afterEach(cleanup)
test.each(['studio', 'viewer'] as const)(
  'should preserve runtime queries and mark %s as the current page',
  (current) => {
    render(() => <WorkspaceNavigation current={current} search="?session=working&motion=idle" />)
    const navigation = within(screen.getByRole('navigation', {name: '작업 공간 이동'}))
    expect(navigation.getByRole('link', {name: 'Editor'})).toHaveAttribute('href', '/editor')
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
  fireEvent.click(navigation.getByRole('button', {name: 'Viewer'}))
  expect(onStudioOpen).toHaveBeenCalledOnce()
  expect(onViewerOpen).toHaveBeenCalledOnce()
})
test('should disable editor destinations without a launch action', () => {
  render(() => <WorkspaceNavigation current="editor" />)
  expect(screen.getByRole('button', {name: 'Studio'})).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Viewer'})).toBeDisabled()
})
