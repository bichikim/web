/** @vitest-environment node */
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {EventActionIds} from '../features/focus-room-dialogue/event-context'
import {createEventActionRunner} from '../features/focus-room-dialogue/use-p-event-controller/event-action-runner'

it('should queue focus-start actions after the active executor unregisters', async () => {
  const actionIds: EventActionIds = {'focus-start': ['music-start']}
  const [getActionIds] = createSignal(actionIds)
  const runner = createEventActionRunner(getActionIds)
  const unregister = runner.register(vi.fn())
  unregister()

  const pendingPlayback = runner.run(['focus-start'])

  expect(pendingPlayback).toBeDefined()

  const executor = vi.fn()
  runner.register(executor)
  await pendingPlayback

  expect(executor).toHaveBeenCalledExactlyOnceWith('music-start')
  runner.dispose()
})
