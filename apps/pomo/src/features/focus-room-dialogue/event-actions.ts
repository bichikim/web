import {setOptionalRecordEntry} from 'src/utils/set-optional-record-entry'
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
): EventActionIds =>
  setOptionalRecordEntry(bindings, eventId, actionIds.length === 0 ? null : actionIds)
