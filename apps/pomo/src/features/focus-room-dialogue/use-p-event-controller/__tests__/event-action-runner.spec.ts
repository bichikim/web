/** @vitest-environment node */

import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import type {EventActionIds} from '../../event-context'
import {RANDOM_DIALOGUE_EVENT} from '../../schema'
import {createEventActionRunner} from '../event-action-runner'

describe('createEventActionRunner', () => {
  it('should retain focus-end and break-end actions before active registration', async () => {
    const actionIds: EventActionIds = {
      'break-end': ['music-start'],
      'focus-end': ['music-stop'],
    }
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingPlayback = runner.run(['break-end', 'focus-end'])
    if (pendingPlayback === undefined) {
      throw new Error('Expected lifecycle playback to wait for an executor.')
    }

    const activeExecutor = vi.fn()
    runner.register(activeExecutor)
    await pendingPlayback

    expect(activeExecutor).toHaveBeenCalledTimes(2)
    expect(activeExecutor).toHaveBeenNthCalledWith(1, 'music-start')
    expect(activeExecutor).toHaveBeenNthCalledWith(2, 'music-stop')
    runner.dispose()
  })

  it('should retain focus-end actions after an active executor is unregistered', async () => {
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

  it('should retain random actions after an active executor is unregistered', async () => {
    const actionIds: EventActionIds = {[RANDOM_DIALOGUE_EVENT]: ['music-start']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const firstExecutor = vi.fn()
    const unregister = runner.register(firstExecutor)
    unregister()

    const pendingPlayback = runner.run([RANDOM_DIALOGUE_EVENT])
    expect(pendingPlayback).toBeDefined()

    const secondExecutor = vi.fn()
    runner.register(secondExecutor)
    await pendingPlayback

    expect(secondExecutor).toHaveBeenCalledExactlyOnceWith('music-start')
    runner.dispose()
  })

  it.each([
    ['focus-start', 'music-start'],
    ['break-start', 'music-start'],
    ['long-break-start', 'music-start'],
    ['long-break-end', 'music-start'],
    ['long-break-end', 'music-stop'],
  ] as const)(
    'should retain actions for %s with %s after an active executor is unregistered',
    async (eventId, actionId) => {
      const actionIds: EventActionIds = {[eventId]: [actionId]}
      const [getActionIds] = createSignal(actionIds)
      const runner = createEventActionRunner(getActionIds)
      const unregister = runner.register(vi.fn())
      unregister()

      const pendingPlayback = runner.run([eventId])
      if (pendingPlayback === undefined) {
        throw new Error(`Expected ${eventId} actions to wait for an executor.`)
      }

      const nextExecutor = vi.fn()
      runner.register(nextExecutor)
      await pendingPlayback

      expect(nextExecutor).toHaveBeenCalledExactlyOnceWith(actionId)
      runner.dispose()
    },
  )

  it('should retain actions until an active executor is registered', async () => {
    const actionIds: EventActionIds = {'focus-start': ['music-start']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingActions = runner.run(['focus-start'])

    if (pendingActions === undefined) {
      throw new Error('Expected focus-start actions to wait for an executor.')
    }

    const executor = vi.fn()
    runner.register(executor)
    await pendingActions

    expect(executor).toHaveBeenCalledExactlyOnceWith('music-start')
    runner.dispose()
  })

  it('should let a deferred handler consume room-enter actions', async () => {
    const actionIds: EventActionIds = {'room-enter': ['music-stop']}
    const [getActionIds] = createSignal(actionIds)
    const runner = createEventActionRunner(getActionIds)
    const pendingPlayback = runner.run(['room-enter'])
    if (pendingPlayback === undefined) {
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
    await expect(pendingPlayback).resolves.toBeUndefined()
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
