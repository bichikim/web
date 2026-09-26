import {getTossRuntimeStorage} from './get-toss-runtime-storage'

/** Loads Apps in Toss storage only when a Toss storage write is actually required. */
export const writeTossStorageJson = async (key: string, value: unknown): Promise<void> => {
  const serializedValue = JSON.stringify(value)
  if (serializedValue === undefined) {
    throw new TypeError('Toss storage value must be JSON serializable.')
  }

  await getTossRuntimeStorage().write(key, serializedValue)
}
