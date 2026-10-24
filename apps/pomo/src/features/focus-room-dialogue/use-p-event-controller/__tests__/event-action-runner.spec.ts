/** @vitest-environment node */

import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import type {EventActionIds} from '../../event-context'
import {FOCUS_ROOM_DIALOGUE_EVENTS, FOCUS_ROOM_ENTRY_EVENT} from '../../schema'
import {createEventActionRunner} from '../event-action-runner'

describe('createEventActionRunner', () => {
  it.each(FOCUS_ROOM_DIALOGUE_EVENTS)(
    'should retain %s actions across active executor unregister and re-register',
    async (eventId) => {
      const actionIds: EventActionIds = {[eventId]: ['music-stop', 'music-start']}
      const runner = createEventActionRunner(() => actionIds)
      const firstExecutor = vi.fn()
      const unregister = runner.register(firstExecutor)
      unregister()

      const firstRun = runner.run([eventId])
      const secondRun = runner.run([eventId])
      if (firstRun.kind !== 'queued' || secondRun.kind !== 'queued') {
        throw new Error(`Expected ${eventId} actions to wait for an executor.`)
      }

      const nextExecutor = vi.fn()
      runner.register(nextExecutor)
      await Promise.all([firstRun.completion, secondRun.completion])

      expect(firstExecutor).not.toHaveBeenCalled()
      expect(nextExecutor.mock.calls).toEqual([
        ['music-stop'],
        ['music-start'],
        ['music-stop'],
        ['music-start'],
      ])
      const laterExecutor = vi.fn()
      runner.register(laterExecutor)
      expect(laterExecutor).not.toHaveBeenCalled()
      runner.dispose()
    },
  )

  it.each(FOCUS_ROOM_DIALOGUE_EVENTS)(
    'should release %s waiting on deferred registration and retain its actions',
    async (eventId) => {
      const actionIds: EventActionIds = {[eventId]: ['music-stop', 'music-start']}
      const runner = createEventActionRunner(() => actionIds)
      const firstRun = runner.run([eventId])
      if (firstRun.kind !== 'queued') {
        throw new Error(`Expected ${eventId} actions to wait for an executor.`)
      }

      const deferredExecutor = vi.fn()
      const unregister = runner.register(deferredExecutor, {mode: 'deferred'})
      await firstRun.completion
      expect(runner.run([eventId])).toEqual({kind: 'completed'})
      expect(deferredExecutor).not.toHaveBeenCalled()
      unregister()

      const activeExecutor = vi.fn()
      runner.register(activeExecutor)
      expect(activeExecutor.mock.calls).toEqual([
        ['music-stop'],
        ['music-start'],
        ['music-stop'],
        ['music-start'],
      ])
      runner.dispose()
    },
  )

  it('should clear delayed-end actions and settle their waiters without clearing other events', async () => {
    const actionIds: EventActionIds = {
      'delayed-end': ['music-stop'],
      'focus-end': ['music-start'],
    }
    const runner = createEventActionRunner(() => actionIds)
    const delayedRun = runner.run(['delayed-end'])
    const focusRun = runner.run(['focus-end'])
    if (delayedRun.kind !== 'queued' || focusRun.kind !== 'queued') {
      throw new Error('Expected both events to wait for an executor.')
    }

    runner.clearDelayedEndActions()
    await delayedRun.completion
    const executor = vi.fn()
    runner.register(executor)
    await focusRun.completion
    expect(executor).toHaveBeenCalledExactlyOnceWith('music-start')
    runner.dispose()
  })

  it('should settle waiting requests and continue remaining actions when an executor throws', async () => {
    const actionIds: EventActionIds = {'focus-end': ['music-stop', 'music-start']}
    const runner = createEventActionRunner(() => actionIds)
    const pendingRun = runner.run(['focus-end'])
    if (pendingRun.kind !== 'queued') {
      throw new Error('Expected the event to wait for an executor.')
    }

    const failure = new Error('Music stop failed')
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const executor = vi.fn((actionId) => {
      if (actionId === 'music-stop') {
        throw failure
      }
    })
    try {
      runner.register(executor)
      await pendingRun.completion
      expect(executor.mock.calls).toEqual([['music-stop'], ['music-start']])
      expect(logError).toHaveBeenCalledExactlyOnceWith(
        'Failed to run a focus room event action.',
        failure,
      )
    } finally {
      logError.mockRestore()
      runner.dispose()
    }
  })

  it('should resolve multiple queued requests on disposal without executing them', async () => {
    const [getActionIds] = createSignal<EventActionIds>({'focus-end': ['music-stop']})
    const runner = createEventActionRunner(getActionIds)
    const first = runner.run(['focus-end'])
    const second = runner.run(['focus-end'])
    if (first.kind !== 'queued' || second.kind !== 'queued') {
      throw new Error('Expected both requests to wait for an executor.')
    }
    runner.dispose()
    await expect(Promise.all([first.completion, second.completion])).resolves.toEqual([
      undefined,
      undefined,
    ])
    const executor = vi.fn()
    runner.register(executor)
    expect(executor).not.toHaveBeenCalled()
  })

  it('should retain focus-end and break-end actions before active registration', async () => {
    const actionIds: EventActionIds = {
      'break-end': ['music-start'],
      'focus-end': ['music-stop'],
    }
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingPlayback = runner.run(['break-end', 'focus-end'])
    if (pendingPlayback.kind !== 'queued') {
      throw new Error('Expected lifecycle playback to wait for an executor.')
    }

    const activeExecutor = vi.fn()
    runner.register(activeExecutor)
    await pendingPlayback.completion

    expect(activeExecutor).toHaveBeenCalledTimes(2)
    expect(activeExecutor).toHaveBeenNthCalledWith(1, 'music-start')
    expect(activeExecutor).toHaveBeenNthCalledWith(2, 'music-stop')
    runner.dispose()
  })

  it('should retain actions until an active executor is registered', async () => {
    const actionIds: EventActionIds = {'focus-start': ['music-start']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingActions = runner.run(['focus-start'])

    if (pendingActions.kind !== 'queued') {
      throw new Error('Expected focus-start actions to wait for an executor.')
    }

    const executor = vi.fn()
    runner.register(executor)
    await pendingActions.completion

    expect(executor).toHaveBeenCalledExactlyOnceWith('music-start')
    runner.dispose()
  })

  it('should retain room-enter actions when an active noop executor is replaced', () => {
    const actionIds: EventActionIds = {[FOCUS_ROOM_ENTRY_EVENT]: ['music-stop']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const noopExecutor = vi.fn()
    const unregisterNoop = runner.register(noopExecutor)

    expect(runner.run([FOCUS_ROOM_ENTRY_EVENT])).toEqual({kind: 'completed'})
    expect(noopExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')

    unregisterNoop()
    const activeExecutor = vi.fn()
    runner.register(activeExecutor)

    expect(activeExecutor).toHaveBeenCalledExactlyOnceWith('music-stop')

    const laterExecutor = vi.fn()
    runner.register(laterExecutor)
    expect(laterExecutor).not.toHaveBeenCalled()
    runner.dispose()
  })

  it('should let a deferred handler consume room-enter actions', async () => {
    const actionIds: EventActionIds = {'room-enter': ['music-stop']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingPlayback = runner.run(['room-enter'])
    if (pendingPlayback.kind !== 'queued') {
      throw new Error('Expected room-enter playback to wait for an executor.')
    }

    const handler = vi.fn(() => true)
    const unregisterHandler = runner.registerHandler(handler)
    const deferredExecutor = vi.fn()
    const unregisterDeferredExecutor = runner.register(deferredExecutor, {mode: 'deferred'})

    expect(handler).toHaveBeenCalledExactlyOnceWith('music-stop')
    expect(deferredExecutor).not.toHaveBeenCalled()

    unregisterDeferredExecutor()
    unregisterHandler()
    const activeExecutor = vi.fn()
    runner.register(activeExecutor)
    await expect(pendingPlayback.completion).resolves.toBeUndefined()
    expect(activeExecutor).not.toHaveBeenCalled()
    runner.dispose()
  })

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

  it('should retain delayed-end actions when clearing while a deferred executor is registered', () => {
    const actionIds: EventActionIds = {'delayed-end': ['music-start']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const unregisterDeferredExecutor = runner.register(vi.fn(), {mode: 'deferred'})

    runner.run(['delayed-end'])
    runner.clearDelayedEndActions()
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
    if (pendingRoomEntry.kind !== 'queued') {
      throw new Error('Expected room-enter playback to wait for an executor.')
    }

    const deferredExecutor = vi.fn()
    const unregisterDeferredExecutor = runner.register(deferredExecutor, {mode: 'deferred'})
    await pendingRoomEntry.completion

    expect(runner.run(['delayed-end'])).toEqual({kind: 'completed'})
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
