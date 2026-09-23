import {loadTossStorage} from './load-toss-storage'

/** Loads Apps in Toss storage only when a Toss storage write is actually required. */
export const writeTossStorageJson = async (key: string, value: unknown): Promise<void> => {
  const storage = await loadTossStorage()
  await storage.setItem(key, JSON.stringify(value))
}
