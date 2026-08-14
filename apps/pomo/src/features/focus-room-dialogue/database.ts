import Dexie, {type Table} from 'dexie'

const DATABASE_NAME = 'pomo-focus-room'

export interface FocusRoomDatabase extends Dexie {
  readonly dialogues: Table<unknown, string>
  readonly eventBindings: Table<unknown, string>
  readonly feedDialogueJobs: Table<unknown, string>
  readonly feedDialogueMetadata: Table<unknown, string>
  readonly feedItems: Table<unknown, string>
}

/** Opens the additive focus-room database shared by manual and feed dialogues. */
export const createFocusRoomDatabase = (): FocusRoomDatabase => {
  const database = new Dexie(DATABASE_NAME) as FocusRoomDatabase

  database.version(1).stores({dialogues: 'id, updatedAt', eventBindings: 'event'})
  database.version(2).stores({
    dialogues: 'id, updatedAt',
    eventBindings: 'event',
    feedDialogueJobs: 'id, status, updatedAt, feedConnectionId, [feedConnectionId+feedItemId]',
    feedDialogueMetadata:
      'dialogueId, expiresAt, feedConnectionId, listenedAt, [feedConnectionId+feedItemId]',
    feedItems: 'id, feedConnectionId, status, discoveredAt',
  })

  return database
}
