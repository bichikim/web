/** @vitest-environment node */
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {EventActionIds} from '../features/focus-room-dialogue/event-context'
import {createEventActionRunner} from '../features/focus-room-dialogue/use-p-event-controller/event-action-runner'

it('should retain focus-end actions after the active executor is unregistered', async () => {
  const actionIds: EventActionIds = {'focus-end': ['music-stop']}
  const [getActionIds] = createSignal(actionIds)
  const runner = createEventActionRunner(getActionIds)
  const firstExecutor = vi.fn()
  const unregister = runner.register(firstExecutor)
  unregister()

  const pendingPlayback = runner.run(['focus-end'])
  expect(pendingPlayback).toBeDefined()

  const secondExecutor = vi.fn()
  runner.register(secondExecutor)
  await pendingPlayback

  expect(secondExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')
  runner.dispose()
})
