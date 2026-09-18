import type {Accessor} from 'solid-js'

import type {EventActionExecutor, EventActionIds} from '../event-context'
import {
  DELAYED_END_EVENT,
  type DialogueEventId,
  type EventActionId,
  FOCUS_ROOM_ENTRY_EVENT,
} from '../schema'

interface EventActionRunner {
  readonly dispose: () => void
  readonly register: (executor: EventActionExecutor) => () => void
  readonly run: (eventIds: ReadonlyArray<DialogueEventId>) => void
}

export const createEventActionRunner = (
  eventActionIds: Accessor<EventActionIds>,
): EventActionRunner => {
  let eventActionExecutor: EventActionExecutor | null = null
  let pendingEventActions: EventActionId[] = []
  let hasRegisteredEventActionExecutor = false

  function executeEventAction(
    actionId: EventActionId,
    executor = eventActionExecutor,
    queueIfUnavailable = false,
  ) {
    if (executor === null) {
      if (queueIfUnavailable && !hasRegisteredEventActionExecutor) {
        pendingEventActions.push(actionId)
      }
      return
    }

    try {
      executor(actionId)
    } catch (error: unknown) {
      console.error('Failed to run a focus room event action.', error)
    }
  }

  const run = (eventIds: ReadonlyArray<DialogueEventId>) => {
    const actionBindings = eventActionIds()
    for (const eventId of eventIds) {
      for (const actionId of actionBindings[eventId] ?? []) {
        const shouldQueueDelayedEndAction =
          eventId === DELAYED_END_EVENT && eventActionExecutor === null

        if (shouldQueueDelayedEndAction) {
          pendingEventActions.push(actionId)
        } else {
          executeEventAction(actionId, eventActionExecutor, eventId === FOCUS_ROOM_ENTRY_EVENT)
        }
      }
    }
  }

  return {
    dispose() {
      pendingEventActions = []
    },
    register(executor) {
      hasRegisteredEventActionExecutor = true
      eventActionExecutor = executor
      const pendingActions = pendingEventActions
      pendingEventActions = []
      for (const actionId of pendingActions) {
        executeEventAction(actionId, executor)
      }
      return () => {
        if (eventActionExecutor === executor) {
          eventActionExecutor = null
        }
      }
    },
    run,
  }
}
