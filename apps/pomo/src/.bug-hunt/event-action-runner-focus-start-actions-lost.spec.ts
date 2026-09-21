/** @vitest-environment node */
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import type {EventActionIds} from '../features/focus-room-dialogue/event-context'
import {createEventActionRunner} from '../features/focus-room-dialogue/use-p-event-controller/event-action-runner'

describe('createEventActionRunner focus-start actions before executor registration', () => {
  it('should run focus-start music actions after the executor registers', () => {
    const actionIds: EventActionIds = {'focus-start': ['music-start']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)

    runner.run(['focus-start'])

    const executor = vi.fn()
    runner.register(executor)

    expect(executor).toHaveBeenCalledExactlyOnceWith('music-start')
  })
})
