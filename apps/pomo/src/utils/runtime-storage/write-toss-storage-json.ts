import {getTossRuntimeStorage} from './get-toss-runtime-storage'

/** 토스 저장소에 실제로 써야 할 때만 Apps in Toss 저장소를 불러온다. */
export const writeTossStorageJson = async (key: string, value: unknown): Promise<void> => {
  const serializedValue = JSON.stringify(value)
  if (serializedValue === undefined) {
    throw new TypeError('Toss storage value must be JSON serializable.')
  }

  await getTossRuntimeStorage().write(key, serializedValue)
}
