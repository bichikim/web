/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {navigateWorkspace} from '../navigate-workspace'
import {useWorkspaceLocation} from '../use-workspace-location'

afterEach(() => {
  history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

test('should react to same-tab navigation with the document and motion query intact', () => {
  const {result} = renderHook(useWorkspaceLocation)
  navigateWorkspace('/studio?session=ren&motion=TapBody%3A0')
  expect(result().pathname).toBe('/studio')
  expect(result().searchParams.get('session')).toBeNull()
  expect(result().searchParams.get('motion')).toBe('TapBody:0')
})

test('should follow browser history events and remove its listener when disposed', () => {
  const remove = vi.spyOn(globalThis, 'removeEventListener')
  const {result, cleanup} = renderHook(useWorkspaceLocation)
  history.replaceState(null, '', '/viewer?session=previous')
  globalThis.dispatchEvent(new PopStateEvent('popstate'))
  expect(result().pathname).toBe('/viewer')
  cleanup()
  expect(remove).toHaveBeenCalledWith('popstate', expect.any(Function))
  navigateWorkspace('/editor')
  expect(result().pathname).toBe('/viewer')
})

test('should reject same-tab navigation and browser history until the active edit is finished', () => {
  history.replaceState(null, '', '/editor')
  let busy = true
  const {result} = renderHook(() => useWorkspaceLocation(() => !busy))
  navigateWorkspace('/viewer')
  expect(location.pathname).toBe('/editor')
  history.replaceState(null, '', '/studio')
  globalThis.dispatchEvent(new PopStateEvent('popstate'))
  expect(location.pathname).toBe('/editor')
  expect(result().pathname).toBe('/editor')
  busy = false
  navigateWorkspace('/viewer')
  expect(result().pathname).toBe('/viewer')
})
