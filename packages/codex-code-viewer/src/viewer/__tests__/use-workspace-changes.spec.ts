/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {useWorkspaceChanges} from '../use-workspace-changes'
import type {ViewerConnection} from '../../shared/contracts'

const disposals: Array<() => void> = []
afterEach(() => disposals.splice(0).forEach((dispose) => dispose()))
it('should retain Git metadata when the same workspace connection object is refreshed', async () => {
  const fixture = createRoot((dispose) => {
    disposals.push(dispose)
    const [session, update] = createSignal<ViewerConnection>({
      session: 'one',
      workspace: '/project',
    })
    const changes = useWorkspaceChanges({
      onError: vi.fn(),
      port: {
        call: vi.fn(),
        context: vi.fn(),
        readChanges: vi.fn().mockResolvedValue({
          available: true,
          base: 'HEAD',
          files: [{kind: 'modified', openable: true, path: 'file.ts'}],
        }),
        start: vi.fn(),
      },
      revision: () => 0,
      session,
      sources: () => [],
    })
    return {changes, update}
  })
  await waitFor(() => expect(fixture.changes.available()).toBe(true))
  fixture.update({session: 'one', workspace: '/project'})
  expect(fixture.changes.available()).toBe(true)
  expect(fixture.changes.files()).toHaveLength(1)
})
