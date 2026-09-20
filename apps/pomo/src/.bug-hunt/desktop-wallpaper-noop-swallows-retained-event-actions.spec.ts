/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import type {EventActionIds} from '../features/focus-room-dialogue/event-context'
import {FOCUS_ROOM_ENTRY_EVENT} from '../features/focus-room-dialogue/schema'
import {createEventActionRunner} from '../features/focus-room-dialogue/use-p-event-controller/event-action-runner'

const eventActionIds = (): EventActionIds => ({
  [FOCUS_ROOM_ENTRY_EVENT]: ['music-stop'],
})

it('should retain a room-enter action when a noop executor is replaced by a real executor', async () => {
  const runner = createEventActionRunner(eventActionIds)
  const noopExecutor = vi.fn()
  const unregisterNoop = runner.register(noopExecutor)

  await runner.run([FOCUS_ROOM_ENTRY_EVENT])

  expect(noopExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')

  unregisterNoop()

  const realExecutor = vi.fn()
  runner.register(realExecutor)

  expect(realExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')
})
