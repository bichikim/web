import {isSSR} from '../is-ssr'

export type StorageType = 'local' | 'session'

const getStorage = (type: StorageType): Storage => {
  switch (type) {
    case 'local':
      return localStorage
    case 'session':
      return sessionStorage
    default:
      return localStorage
  }
}

const TEST_KEY_VALUE = '__storage_test__'

export const getStorageAvailable = (type: StorageType): Storage | undefined => {
  if (isSSR()) {
    return
  }

  const storage = getStorage(type)
  try {
    storage.setItem(TEST_KEY_VALUE, TEST_KEY_VALUE)
    storage.removeItem(TEST_KEY_VALUE)
    return storage
  } catch {
    return undefined
  }
}
