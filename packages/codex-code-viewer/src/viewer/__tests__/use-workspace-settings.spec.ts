/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useWorkspaceSettings} from '../use-workspace-settings'

afterEach(cleanup)
it('should apply the entered folder and clear an earlier error', async () => {
  const apply = vi.fn().mockRejectedValueOnce(new Error('missing folder')).mockResolvedValue(true)
  const hook = renderHook(() =>
    useWorkspaceSettings({active: () => true, apply, workspace: () => '/old'}),
  )
  hook.result.change('/new')
  await hook.result.submit()
  expect(hook.result.feedback()).toBe('missing folder')
  expect(hook.result.path()).toBe('/new')
  await hook.result.submit()
  expect(apply).toHaveBeenLastCalledWith('/new')
  expect(hook.result.feedback()).toBeNull()
})
it('should follow the current folder when settings reopen and prevent duplicate submissions', async () => {
  let finish: (value: boolean) => void = () => {}
  const apply = vi.fn().mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve
      }),
  )
  const [active, setActive] = createSignal(true)
  const [workspace, setWorkspace] = createSignal('/old')
  const hook = renderHook(() => useWorkspaceSettings({active, apply, workspace}))
  hook.result.change('/new')
  const pending = hook.result.submit()
  await hook.result.submit()
  expect(apply).toHaveBeenCalledTimes(1)
  expect(hook.result.pending()).toBe(true)
  finish(false)
  await pending
  expect(hook.result.pending()).toBe(false)
  setActive(false)
  setWorkspace('/changed-elsewhere')
  setActive(true)
  expect(hook.result.path()).toBe('/changed-elsewhere')
})
it('should not submit an empty path', async () => {
  const apply = vi.fn()
  const hook = renderHook(() =>
    useWorkspaceSettings({active: () => true, apply, workspace: () => ''}),
  )
  hook.result.change('  ')
  await hook.result.submit()
  expect(apply).not.toHaveBeenCalled()
})
