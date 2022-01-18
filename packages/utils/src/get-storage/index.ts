import {getWindow} from 'src/browser'

export type StorageType = 'local' | 'session'

const _getStorage = (type: StorageType): Storage | undefined => {
  const window = getWindow()
  switch (type) {
    // eslint-disable-next-line indent
    case 'local':
      return window?.localStorage
    case 'session':
      return window?.sessionStorage
  }
}

/**
 * a key for testing setItem
 */
const TEST_KEY_VALUE = '__storage_test__'

export const createGetStorage = () => {
  let _testResult

  return (type: StorageType): Storage | undefined => {
    const storage = _getStorage(type)

    if (!storage) {
      return
    }

    // skip if it has test result
    if (typeof _testResult === 'undefined') {
      // test setItem
      try {
        storage.setItem(TEST_KEY_VALUE, TEST_KEY_VALUE)
        storage.removeItem(TEST_KEY_VALUE)
        _testResult = true
      } catch {
        // save test result
        _testResult = false
      }
    }

    if (_testResult) {
      return storage
    }
  }
}

/**
 * @deprecated use soft-storage
 */
export const getStorage = createGetStorage()
