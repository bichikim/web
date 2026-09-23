import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {createDelayedEndEventPlayback} from '../delayed-end-playback'

describe('createDelayedEndEventPlayback', () => {
  it('should coalesce concurrent requests for the same delayed-end event', async () => {
    const [isPlaybackEnabled] = createSignal(true)
    const pendingPlayback = Promise.withResolvers<void>()
    const playDialogueEvents = vi.fn(() => pendingPlayback.promise)
    const delayedEndPlayback = createDelayedEndEventPlayback({
      beforePlaybackCallbacks: new Set<() => void>(),
      isPlaybackEnabled,
      playDialogueEvents,
    })

    const firstRequest = delayedEndPlayback.request()
    const secondRequest = delayedEndPlayback.request()

    expect(playDialogueEvents).toHaveBeenCalledOnce()

    pendingPlayback.resolve()

    await expect(firstRequest).resolves.toBeUndefined()
    await expect(secondRequest).resolves.toBeUndefined()
  })

  it('should retry a pending request after the active playback settles', async () => {
    const [isPlaybackEnabled, setPlaybackEnabled] = createSignal(true)
    const firstPlayback = Promise.withResolvers<void>()
    const secondPlayback = Promise.withResolvers<void>()
    const playDialogueEvents = vi
      .fn()
      .mockReturnValueOnce(firstPlayback.promise)
      .mockReturnValueOnce(secondPlayback.promise)
    const delayedEndPlayback = createDelayedEndEventPlayback({
      beforePlaybackCallbacks: new Set<() => void>(),
      isPlaybackEnabled,
      playDialogueEvents,
    })

    const firstRequest = delayedEndPlayback.request()
    setPlaybackEnabled(false)
    delayedEndPlayback.retainPendingEventOnSuspension()
    setPlaybackEnabled(true)
    const catchUpRequest = delayedEndPlayback.request()

    expect(playDialogueEvents).toHaveBeenCalledOnce()

    firstPlayback.resolve()
    await vi.waitFor(() => expect(playDialogueEvents).toHaveBeenCalledTimes(2))

    secondPlayback.resolve()

    await expect(firstRequest).resolves.toBeUndefined()
    await expect(catchUpRequest).resolves.toBeUndefined()
  })

  it('should retain a pending request when playback fails so it can be retried', async () => {
    const [isPlaybackEnabled, setPlaybackEnabled] = createSignal(false)
    const playbackFailure = new Error('Playback failed')
    const playDialogueEvents = vi
      .fn()
      .mockRejectedValueOnce(playbackFailure)
      .mockResolvedValueOnce(undefined)
    const delayedEndPlayback = createDelayedEndEventPlayback({
      beforePlaybackCallbacks: new Set<() => void>(),
      isPlaybackEnabled,
      playDialogueEvents,
    })

    await delayedEndPlayback.request()
    setPlaybackEnabled(true)

    await expect(delayedEndPlayback.request()).rejects.toBe(playbackFailure)
    expect(delayedEndPlayback.hasPendingEvent()).toBe(true)

    await expect(delayedEndPlayback.request()).resolves.toBeUndefined()
    expect(playDialogueEvents).toHaveBeenCalledTimes(2)
    expect(delayedEndPlayback.hasPendingEvent()).toBe(false)
  })

  it('should keep an explicitly cleared request from being restored after failure', async () => {
    const [isPlaybackEnabled] = createSignal(true)
    const playbackFailure = new Error('Playback failed')
    const pendingPlayback = Promise.withResolvers<void>()
    const playDialogueEvents = vi.fn(() => pendingPlayback.promise)
    const delayedEndPlayback = createDelayedEndEventPlayback({
      beforePlaybackCallbacks: new Set<() => void>(),
      isPlaybackEnabled,
      playDialogueEvents,
    })

    const request = delayedEndPlayback.request()
    delayedEndPlayback.clearPendingEvent()
    pendingPlayback.reject(playbackFailure)

    await expect(request).rejects.toBe(playbackFailure)
    expect(delayedEndPlayback.hasPendingEvent()).toBe(false)
  })
})
