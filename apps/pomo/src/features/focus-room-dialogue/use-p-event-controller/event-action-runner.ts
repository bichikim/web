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
  readonly run: (eventIds: ReadonlyArray<DialogueEventId>) => Promise<void> | undefined
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
  let pendingActionWaiters: Array<() => void> = []
  let hasRegisteredEventActionExecutor = false

  const queueEventAction = (eventId: DialogueEventId, actionId: EventActionId) => {
    pendingEventActions.push({actionId, eventId})
  }

  const resolvePendingActionWaiters = () => {
    const waiters = pendingActionWaiters
    pendingActionWaiters = []
    for (const resolve of waiters) {
      resolve()
    }
  }

  const run = (eventIds: ReadonlyArray<DialogueEventId>) => {
    const actionBindings = eventActionIds()
    let shouldWaitForActionExecution = false
    for (const eventId of eventIds) {
      for (const actionId of actionBindings[eventId] ?? []) {
        const executor = eventActionExecutor
        const shouldQueueAction =
          executor === null &&
          (eventId === DELAYED_END_EVENT ||
            (eventId === FOCUS_ROOM_ENTRY_EVENT && !hasRegisteredEventActionExecutor))

        if (shouldQueueAction) {
          queueEventAction(eventId, actionId)
          shouldWaitForActionExecution ||= eventId === FOCUS_ROOM_ENTRY_EVENT
        } else {
          executeEventAction(actionId, executor)
        }
      }
    }

    if (!shouldWaitForActionExecution) {
      return undefined
    }

    const actionExecution = Promise.withResolvers<void>()
    pendingActionWaiters.push(actionExecution.resolve)
    return actionExecution.promise
  }

  return {
    clearDelayedEndActions() {
      pendingEventActions = pendingEventActions.filter(({eventId}) => eventId !== DELAYED_END_EVENT)
    },
    dispose() {
      pendingEventActions = []
      resolvePendingActionWaiters()
    },
    register(executor) {
      hasRegisteredEventActionExecutor = true
      eventActionExecutor = executor
      const pendingActions = pendingEventActions
      pendingEventActions = []
      for (const pendingAction of pendingActions) {
        executeEventAction(pendingAction.actionId, executor)
      }
      resolvePendingActionWaiters()
      return () => {
        if (eventActionExecutor === executor) {
          eventActionExecutor = null
        }
      }
    },
    run,
  }
}
