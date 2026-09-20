/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {FOCUS_ROOM_ENTRY_EVENT} from '../features/focus-room-dialogue/schema'
import {createEventActionRunner} from '../features/focus-room-dialogue/use-p-event-controller/event-action-runner'

it('should queue room-enter actions after the executor is temporarily unregistered', () => {
  const [actionIds] = createSignal({[FOCUS_ROOM_ENTRY_EVENT]: ['music-start'] as const})
  const runner = createEventActionRunner(actionIds)
  const firstExecutor = vi.fn()
  const unregister = runner.register(firstExecutor)
  unregister()

  runner.run([FOCUS_ROOM_ENTRY_EVENT])

  const nextExecutor = vi.fn()
  runner.register(nextExecutor)

  expect(nextExecutor).toHaveBeenCalledWith('music-start')
})
