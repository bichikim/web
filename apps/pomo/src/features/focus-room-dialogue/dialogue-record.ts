import type {PDatabase} from './database'
import {dialogueEventBindingSchema, FOCUS_ROOM_DIALOGUE_EVENTS} from './schema'

/** Deletes a dialogue record and removes it from every persisted event binding. */
export const deleteDialogueRecord = async (database: PDatabase, dialogueId: string) => {
  await database.dialogues.delete(dialogueId)
  const bindings = await Promise.all(
    FOCUS_ROOM_DIALOGUE_EVENTS.map((event) => database.eventBindings.get(event)),
  )

  await Promise.all(
    bindings.map(async (storedBinding) => {
      if (storedBinding === undefined) {
        return
      }

      const binding = dialogueEventBindingSchema.parse(storedBinding)
      const remainingIds = binding.dialogueIds.filter((id) => id !== dialogueId)

      if (remainingIds.length === binding.dialogueIds.length) {
        return
      }

      if (remainingIds.length === 0) {
        await database.eventBindings.delete(binding.event)
        return
      }

      await database.eventBindings.put({...binding, dialogueIds: remainingIds})
    }),
  )
}
