import type {Accessor} from 'solid-js'

import type {
  EventActionExecutor,
  EventActionExecutorMode,
  EventActionExecutorRegistrationOptions,
  EventActionHandler,
  EventActionIds,
} from '../event-context'
import {
  DELAYED_END_EVENT,
  type DialogueEventId,
  type EventActionId,
  FOCUS_ROOM_ENTRY_EVENT,
  RANDOM_DIALOGUE_EVENT,
} from '../schema'

interface EventActionRunner {
  readonly clearDelayedEndActions: () => void
  readonly dispose: () => void
  readonly registerHandler: (handler: EventActionHandler) => () => void
  readonly register: (
    executor: EventActionExecutor,
    options?: EventActionExecutorRegistrationOptions,
  ) => () => void
  readonly run: (eventIds: ReadonlyArray<DialogueEventId>) => EventActionRunResult
}

type EventActionRunResult =
  | {readonly kind: 'completed'}
  | {readonly kind: 'queued'; readonly completion: Promise<void>}

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

const executeEventActionHandler = (actionId: EventActionId, handler: EventActionHandler) => {
  try {
    return handler(actionId)
  } catch (error: unknown) {
    console.error('Failed to handle a focus room event action.', error)
    return false
  }
}

export const createEventActionRunner = (
  eventActionIds: Accessor<EventActionIds>,
): EventActionRunner => {
  let eventActionRegistration: RegisteredEventActionExecutor | null = null
  const eventActionHandlers = new Set<EventActionHandler>()
  let hasRegisteredActiveEventActionExecutor = false
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

  const notifyEventActionHandlers = (actionId: EventActionId) => {
    let isHandled = false
    for (const handler of eventActionHandlers) {
      if (executeEventActionHandler(actionId, handler)) {
        isHandled = true
      }
    }
    return isHandled
  }

  const handleEventAction = (
    eventId: DialogueEventId,
    actionId: EventActionId,
    queuedActionEventIds: Set<DialogueEventId>,
  ) => {
    const registration = eventActionRegistration
    const isDeferredExecutor = registration?.mode === 'deferred'
    const isHandledByHandler = isDeferredExecutor && notifyEventActionHandlers(actionId)
    const executor = isDeferredExecutor ? null : (registration?.executor ?? null)
    const shouldQueueAction =
      isDeferredExecutor ||
      (executor === null &&
        (!hasRegisteredActiveEventActionExecutor ||
          eventId === DELAYED_END_EVENT ||
          eventId === FOCUS_ROOM_ENTRY_EVENT ||
          eventId === 'break-end' ||
          eventId === 'break-start' ||
          eventId === 'focus-end' ||
          eventId === 'focus-start' ||
          eventId === 'long-break-end' ||
          eventId === 'long-break-start' ||
          eventId === RANDOM_DIALOGUE_EVENT))

    if (isHandledByHandler) {
      return
    }

    if (!shouldQueueAction) {
      executeEventAction(actionId, executor)
      return
    }

    queueEventAction(eventId, actionId)
    if (!isDeferredExecutor) {
      queuedActionEventIds.add(eventId)
    }
  }

  const handlePendingEventActions = (handler: EventActionHandler) => {
    const pendingActions = pendingEventActions
    pendingEventActions = []
    for (const pendingAction of pendingActions) {
      const isHandled = executeEventActionHandler(pendingAction.actionId, handler)
      if (!isHandled) {
        pendingEventActions.push(pendingAction)
      }
    }
  }

  const run = (eventIds: ReadonlyArray<DialogueEventId>) => {
    const actionBindings = eventActionIds()
    const queuedActionEventIds = new Set<DialogueEventId>()
    for (const eventId of eventIds) {
      for (const actionId of actionBindings[eventId] ?? []) {
        handleEventAction(eventId, actionId, queuedActionEventIds)
      }
    }

    if (queuedActionEventIds.size === 0) {
      return {kind: 'completed'} as const
    }

    const actionExecutions = [...queuedActionEventIds].map((eventId) => {
      const actionExecution = Promise.withResolvers<void>()
      pendingActionWaiters.push({eventId, resolve: actionExecution.resolve})
      return actionExecution.promise
    })
    return {
      completion: Promise.all(actionExecutions).then(() => undefined),
      kind: 'queued',
    } as const
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
      eventActionHandlers.clear()
      pendingEventActions = []
      resolvePendingActionWaiters()
    },
    register(executor, options) {
      const registration = {
        executor,
        mode: options?.mode ?? 'active',
      } satisfies RegisteredEventActionExecutor
      hasRegisteredActiveEventActionExecutor ||= registration.mode === 'active'
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
    registerHandler(handler) {
      eventActionHandlers.add(handler)
      handlePendingEventActions(handler)
      return () => {
        eventActionHandlers.delete(handler)
      }
    },
    run,
  }
}
