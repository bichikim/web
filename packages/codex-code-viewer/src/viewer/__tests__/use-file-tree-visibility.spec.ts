/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {ViewerConnection} from '../../shared/contracts'
import {useFileTreeVisibility} from '../use-file-tree-visibility'

it('should restore a closed folder-only panel and persist explicit toggles', () => {
  const save = vi.fn().mockResolvedValue(undefined)
  const current: ViewerConnection = {
    session: 'one',
    treeState: {visible: false},
    workspace: '/project',
  }
  const mounted = renderHook(() => useFileTreeVisibility(() => current, save))
  expect(mounted.result.visible()).toBe(false)
  mounted.result.toggle()
  expect(mounted.result.visible()).toBe(true)
  expect(save).toHaveBeenCalledExactlyOnceWith('one', {visible: true})
  mounted.cleanup()
})

it('should restore each new connection while preserving toggles on document updates', () => {
  let dispose = () => {}
  const mounted = createRoot((cleanup) => {
    dispose = cleanup
    const [session, setSession] = createSignal<ViewerConnection | null>(null)
    return {setSession, tree: useFileTreeVisibility(session)}
  })
  mounted.setSession({session: 'one', workspace: '/project'})
  expect(mounted.tree.visible()).toBe(true)
  mounted.tree.toggle()
  mounted.setSession({session: 'one', workspace: '/project'})
  expect(mounted.tree.visible()).toBe(false)
  mounted.setSession({session: 'two', treeState: {visible: true}, workspace: '/other'})
  expect(mounted.tree.visible()).toBe(true)
  dispose()
})

it('should retain the latest local toggle when a replacement session carries an older snapshot', () => {
  const saving = Promise.withResolvers<void>()
  const save = vi.fn(() => saving.promise)
  const [session, setSession] = createSignal<ViewerConnection>({
    session: 'first',
    treeState: {visible: false},
    workspace: '/project',
  })
  const mounted = renderHook(() => useFileTreeVisibility(session, save))
  mounted.result.toggle()
  setSession({session: 'replacement', treeState: {visible: false}, workspace: '/project'})
  expect(mounted.result.visible()).toBe(true)
  setSession({session: 'other', treeState: {visible: false}, workspace: '/other'})
  expect(mounted.result.visible()).toBe(false)
  setSession({session: 'returned', treeState: {visible: false}, workspace: '/project'})
  expect(mounted.result.visible()).toBe(true)
  saving.resolve()
  mounted.cleanup()
})

it('should retain the initially open panel when a file replaces a folder-only connection', () => {
  const [session, setSession] = createSignal<ViewerConnection>({
    session: 'folder',
    workspace: '/project',
  })
  const mounted = renderHook(() => useFileTreeVisibility(session))
  expect(mounted.result.visible()).toBe(true)
  setSession({
    document: {
      lines: [[]],
      location: {column: 1, line: 1, path: 'notes.txt'},
      revision: 'one',
      source: '',
    },
    session: 'file',
    workspace: '/project',
  })
  expect(mounted.result.visible()).toBe(true)
  mounted.cleanup()
})
