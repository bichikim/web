import {isSSR} from '../is-ssr'

export type StorageType = 'local' | 'session'

const _getStorage = (type: StorageType): Storage => {
  switch (type) {
    // eslint-disable-next-line indent
    case 'local':
      return localStorage
    case 'session':
      return sessionStorage
  }
}

const TEST_KEY_VALUE = '__storage_test__'

export const createGetStorage = () => {
  let _testResult

  return (type: StorageType): Storage | undefined => {
    if (isSSR()) {
      return
    }

    const storage = _getStorage(type)

    if (typeof _testResult === 'undefined') {
      try {
        storage.setItem(TEST_KEY_VALUE, TEST_KEY_VALUE)
        storage.removeItem(TEST_KEY_VALUE)
        _testResult = true
      } catch {
        _testResult = false
      }
    }

    if (_testResult) {
      return storage
    }
  }
}

export const getStorage = createGetStorage()
