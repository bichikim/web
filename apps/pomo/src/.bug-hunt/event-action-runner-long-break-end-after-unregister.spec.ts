/** @vitest-environment node */
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {EventActionIds} from '../features/focus-room-dialogue/event-context'
import {createEventActionRunner} from '../features/focus-room-dialogue/use-p-event-controller/event-action-runner'

it('should queue long-break-end actions after the active executor unregisters', async () => {
  const actionIds: EventActionIds = {'long-break-end': ['music-stop']}
  const [getActionIds] = createSignal(actionIds)
  const runner = createEventActionRunner(getActionIds)
  const unregister = runner.register(vi.fn())
  unregister()

  const pendingPlayback = runner.run(['long-break-end'])

  expect(pendingPlayback).toBeDefined()

  const executor = vi.fn()
  runner.register(executor)
  await pendingPlayback

  expect(executor).toHaveBeenCalledExactlyOnceWith('music-stop')
  runner.dispose()
})
