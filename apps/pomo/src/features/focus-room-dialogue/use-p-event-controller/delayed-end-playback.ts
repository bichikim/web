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
  readonly hasPendingEvent: Accessor<boolean>
  readonly request: () => Promise<void>
}

export const createDelayedEndEventPlayback = (
  options: CreateDelayedEndEventPlaybackOptions,
): DelayedEndEventPlayback => {
  const [hasPendingEvent, setHasPendingEvent] = createSignal(false)

  const playEvent = () =>
    options.playDialogueEvents([DELAYED_END_EVENT], () => {
      options.beforePlaybackCallbacks.forEach((callback) => callback())
    })

  const request = async (): Promise<void> => {
    if (!options.isPlaybackEnabled()) {
      setHasPendingEvent(true)
      return
    }

    setHasPendingEvent(false)
    await playEvent()
  }

  return {hasPendingEvent, request}
}
