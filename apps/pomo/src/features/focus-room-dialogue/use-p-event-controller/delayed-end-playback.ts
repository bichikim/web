import {type Accessor, createSignal} from 'solid-js'

import {DELAYED_END_EVENT, type DialogueEventId} from '../schema'

interface CreateDelayedEndEventPlaybackOptions {
  readonly beforePlaybackCallbacks: ReadonlySet<() => void>
  readonly isPlaybackEnabled: Accessor<boolean>
  readonly playDialogueEvents: (
    eventIds: ReadonlyArray<DialogueEventId>,
    onBeforePlayback?: () => void,
  ) => Promise<void>
}

interface DelayedEndEventPlayback {
  readonly clearPendingEvent: () => void
  readonly hasPendingEvent: Accessor<boolean>
  readonly isActive: Accessor<boolean>
  readonly retainPendingEventOnSuspension: () => void
  readonly request: () => Promise<void>
}

export const createDelayedEndEventPlayback = (
  options: CreateDelayedEndEventPlaybackOptions,
): DelayedEndEventPlayback => {
  const [hasPendingEvent, setHasPendingEvent] = createSignal(false)
  let activeRequest: Promise<void> | null = null

  const playEvent = () =>
    options.playDialogueEvents([DELAYED_END_EVENT], () => {
      options.beforePlaybackCallbacks.forEach((callback) => callback())
    })

  const request = async (): Promise<void> => {
    if (!options.isPlaybackEnabled()) {
      setHasPendingEvent(true)
      return
    }

    if (activeRequest !== null) {
      await activeRequest
      if (options.isPlaybackEnabled() && hasPendingEvent()) {
        await request()
      }
      return
    }

    setHasPendingEvent(false)
    const currentRequest = playEvent()
    activeRequest = currentRequest
    try {
      await currentRequest
    } finally {
      if (activeRequest === currentRequest) {
        activeRequest = null
      }
    }
  }

  const retainPendingEventOnSuspension = () => {
    if (activeRequest !== null) {
      setHasPendingEvent(true)
    }
  }

  const clearPendingEvent = () => {
    setHasPendingEvent(false)
  }

  return {
    clearPendingEvent,
    hasPendingEvent,
    isActive: () => activeRequest !== null,
    request,
    retainPendingEventOnSuspension,
  }
}
