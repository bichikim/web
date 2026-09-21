import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import type {EventActionIds} from '../../event-context'
import {createEventActionRunner} from '../event-action-runner'

describe('createEventActionRunner', () => {
  it('should retain non-lifecycle actions while a deferred executor is registered', () => {
    const actionIds: EventActionIds = {'focus-start': ['music-start']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const deferredExecutor = vi.fn()
    const unregisterDeferredExecutor = runner.register(deferredExecutor, {mode: 'deferred'})

    runner.run(['focus-start'])

    expect(deferredExecutor).not.toHaveBeenCalled()

    unregisterDeferredExecutor()
    const activeExecutor = vi.fn()
    runner.register(activeExecutor)

    expect(activeExecutor).toHaveBeenCalledExactlyOnceWith('music-start')
    runner.dispose()
  })

  it('should retain room-enter and delayed-end actions while a deferred executor releases playback', async () => {
    const actionIds: EventActionIds = {
      'delayed-end': ['music-start'],
      'room-enter': ['music-stop'],
    }
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingRoomEntry = runner.run(['room-enter'])
    if (pendingRoomEntry === undefined) {
      throw new Error('Expected room-enter playback to wait for an executor.')
    }

    const deferredExecutor = vi.fn()
    const unregisterDeferredExecutor = runner.register(deferredExecutor, {mode: 'deferred'})
    await pendingRoomEntry

    expect(runner.run(['delayed-end'])).toBeUndefined()
    expect(deferredExecutor).not.toHaveBeenCalled()

    unregisterDeferredExecutor()
    const activeExecutor = vi.fn()
    runner.register(activeExecutor)

    expect(activeExecutor).toHaveBeenCalledTimes(2)
    expect(activeExecutor).toHaveBeenNthCalledWith(1, 'music-stop')
    expect(activeExecutor).toHaveBeenLastCalledWith('music-start')

    runner.dispose()
  })
})
