import type {Accessor} from 'solid-js'

import type {
  EventActionExecutor,
  EventActionExecutorMode,
  EventActionExecutorRegistrationOptions,
  EventActionIds,
} from '../event-context'
import {
  DELAYED_END_EVENT,
  type DialogueEventId,
  type EventActionId,
  FOCUS_ROOM_ENTRY_EVENT,
} from '../schema'

interface EventActionRunner {
  readonly clearDelayedEndActions: () => void
  readonly dispose: () => void
  readonly register: (
    executor: EventActionExecutor,
    options?: EventActionExecutorRegistrationOptions,
  ) => () => void
  readonly run: (eventIds: ReadonlyArray<DialogueEventId>) => Promise<void> | undefined
}

interface PendingEventAction {
  readonly actionId: EventActionId
  readonly eventId: DialogueEventId
}

interface PendingActionWaiter {
  readonly eventId: DialogueEventId
  readonly resolve: () => void
}

interface RegisteredEventActionExecutor {
  readonly executor: EventActionExecutor
  readonly mode: EventActionExecutorMode
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
  let eventActionRegistration: RegisteredEventActionExecutor | null = null
  let pendingEventActions: PendingEventAction[] = []
  let pendingActionWaiters: PendingActionWaiter[] = []

  const queueEventAction = (eventId: DialogueEventId, actionId: EventActionId) => {
    pendingEventActions.push({actionId, eventId})
  }

  const resolvePendingActionWaiters = (eventId?: DialogueEventId) => {
    const waiters = pendingActionWaiters
    pendingActionWaiters =
      eventId === undefined ? [] : waiters.filter((waiter) => waiter.eventId !== eventId)
    for (const waiter of waiters) {
      if (eventId === undefined || waiter.eventId === eventId) {
        waiter.resolve()
      }
    }
  }

  const run = (eventIds: ReadonlyArray<DialogueEventId>) => {
    const actionBindings = eventActionIds()
    const queuedActionEventIds = new Set<DialogueEventId>()
    for (const eventId of eventIds) {
      for (const actionId of actionBindings[eventId] ?? []) {
        const registration = eventActionRegistration
        const isDeferredExecutor = registration?.mode === 'deferred'
        const executor = isDeferredExecutor ? null : (registration?.executor ?? null)
        const shouldQueueAction =
          isDeferredExecutor ||
          (executor === null &&
            (eventId === DELAYED_END_EVENT || eventId === FOCUS_ROOM_ENTRY_EVENT))

        if (shouldQueueAction) {
          queueEventAction(eventId, actionId)
          if (!isDeferredExecutor) {
            queuedActionEventIds.add(eventId)
          }
        } else {
          executeEventAction(actionId, executor)
        }
      }
    }

    if (queuedActionEventIds.size === 0) {
      return undefined
    }

    const actionExecutions = [...queuedActionEventIds].map((eventId) => {
      const actionExecution = Promise.withResolvers<void>()
      pendingActionWaiters.push({eventId, resolve: actionExecution.resolve})
      return actionExecution.promise
    })
    return Promise.all(actionExecutions).then(() => undefined)
  }

  return {
    clearDelayedEndActions() {
      if (eventActionRegistration?.mode === 'deferred') {
        return
      }

      pendingEventActions = pendingEventActions.filter(({eventId}) => eventId !== DELAYED_END_EVENT)
      resolvePendingActionWaiters(DELAYED_END_EVENT)
    },
    dispose() {
      pendingEventActions = []
      resolvePendingActionWaiters()
    },
    register(executor, options) {
      const registration = {
        executor,
        mode: options?.mode ?? 'active',
      } satisfies RegisteredEventActionExecutor
      eventActionRegistration = registration
      if (registration.mode === 'deferred') {
        resolvePendingActionWaiters()
        return () => {
          if (eventActionRegistration?.executor === executor) {
            eventActionRegistration = null
          }
        }
      }

      const pendingActions = pendingEventActions
      pendingEventActions = []
      for (const pendingAction of pendingActions) {
        executeEventAction(pendingAction.actionId, registration.executor)
      }
      resolvePendingActionWaiters()
      return () => {
        if (eventActionRegistration?.executor === executor) {
          eventActionRegistration = null
        }
      }
    },
    run,
  }
}
