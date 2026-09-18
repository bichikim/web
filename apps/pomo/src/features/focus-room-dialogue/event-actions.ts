import type {EventActionIds} from './event-context'
import type {DialogueEventBinding, DialogueEventId, EventActionId} from './schema'

export const getEventActionIds = (bindings: ReadonlyArray<DialogueEventBinding>): EventActionIds =>
  Object.fromEntries(
    bindings.flatMap((binding) => {
      const actionIds = binding.actionIds ?? []
      return actionIds.length === 0 ? [] : [[binding.event, actionIds] as const]
    }),
  )

export const updateEventActionBinding = (
  bindings: EventActionIds,
  eventId: DialogueEventId,
  actionIds: ReadonlyArray<EventActionId>,
): EventActionIds => {
  const nextBindings = {...bindings}

  if (actionIds.length === 0) {
    delete nextBindings[eventId]
  } else {
    nextBindings[eventId] = actionIds
  }

  return nextBindings
}
