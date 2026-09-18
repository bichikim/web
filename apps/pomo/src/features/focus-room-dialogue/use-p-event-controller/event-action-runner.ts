import type {Accessor} from 'solid-js'

import type {EventActionExecutor, EventActionIds} from '../event-context'
import {
  DELAYED_END_EVENT,
  type DialogueEventId,
  type EventActionId,
  FOCUS_ROOM_ENTRY_EVENT,
} from '../schema'

interface EventActionRunner {
  readonly clearDelayedEndActions: () => void
  readonly dispose: () => void
  readonly register: (executor: EventActionExecutor) => () => void
  readonly run: (eventIds: ReadonlyArray<DialogueEventId>) => void
}

interface PendingEventAction {
  readonly actionId: EventActionId
  readonly eventId: DialogueEventId
}

const executeEventAction = (actionId: EventActionId, executor: EventActionExecutor | null) => {
  if (executor === null) {
    return
  }

  try {
    executor(actionId)
  } catch (error: unknown) {
    console.error('Failed to run a focus room event action.', error)
  }
}

export const createEventActionRunner = (
  eventActionIds: Accessor<EventActionIds>,
): EventActionRunner => {
  let eventActionExecutor: EventActionExecutor | null = null
  let pendingEventActions: PendingEventAction[] = []
  let hasRegisteredEventActionExecutor = false

  const queueEventAction = (eventId: DialogueEventId, actionId: EventActionId) => {
    pendingEventActions.push({actionId, eventId})
  }

  const run = (eventIds: ReadonlyArray<DialogueEventId>) => {
    const actionBindings = eventActionIds()
    for (const eventId of eventIds) {
      for (const actionId of actionBindings[eventId] ?? []) {
        const executor = eventActionExecutor
        const shouldQueueAction =
          executor === null &&
          (eventId === DELAYED_END_EVENT ||
            (eventId === FOCUS_ROOM_ENTRY_EVENT && !hasRegisteredEventActionExecutor))

        if (shouldQueueAction) {
          queueEventAction(eventId, actionId)
        } else {
          executeEventAction(actionId, executor)
        }
      }
    }
  }

  return {
    clearDelayedEndActions() {
      pendingEventActions = pendingEventActions.filter(({eventId}) => eventId !== DELAYED_END_EVENT)
    },
    dispose() {
      pendingEventActions = []
    },
    register(executor) {
      hasRegisteredEventActionExecutor = true
      eventActionExecutor = executor
      const pendingActions = pendingEventActions
      pendingEventActions = []
      for (const pendingAction of pendingActions) {
        executeEventAction(pendingAction.actionId, executor)
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
