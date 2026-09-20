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
  readonly retainPendingEventOnSuspension: () => void
  readonly request: () => Promise<void>
}

export const createDelayedEndEventPlayback = (
  options: CreateDelayedEndEventPlaybackOptions,
): DelayedEndEventPlayback => {
  const [hasPendingEvent, setHasPendingEvent] = createSignal(false)
  let isRequestActive = false

  const playEvent = () =>
    options.playDialogueEvents([DELAYED_END_EVENT], () => {
      options.beforePlaybackCallbacks.forEach((callback) => callback())
    })

  const request = async (): Promise<void> => {
    if (!options.isPlaybackEnabled()) {
      setHasPendingEvent(true)
      return
    }

    isRequestActive = true
    setHasPendingEvent(false)
    try {
      await playEvent()
    } finally {
      isRequestActive = false
    }
  }

  const retainPendingEventOnSuspension = () => {
    if (isRequestActive) {
      setHasPendingEvent(true)
    }
  }

  const clearPendingEvent = () => {
    setHasPendingEvent(false)
  }

  return {clearPendingEvent, hasPendingEvent, request, retainPendingEventOnSuspension}
}
