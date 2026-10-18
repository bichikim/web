import localStorageDriver from 'unstorage/drivers/localstorage'

interface SynchronousWebStorageDriver {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const expectSynchronousCompletion = (result: void | Promise<void>): void => {
  if (result !== undefined) {
    throw new TypeError('Web storage driver must complete synchronously.')
  }
}

/** 브라우저의 동기 읽기·쓰기를 유지하면서 unstorage의 localStorage 드라이버를 사용한다. */
export const createWebStorageDriver = (
  storage: Storage = globalThis.localStorage,
): SynchronousWebStorageDriver => {
  const driver = localStorageDriver({storage})
  const {removeItem, setItem} = driver
  if (removeItem === undefined || setItem === undefined) {
    throw new TypeError('Web storage driver must support writing and removal.')
  }

  return {
    getItem: (key) => {
      const value = driver.getItem(key)
      if (value === null || typeof value === 'string') {
        return value
      }
      throw new TypeError('Web storage driver must return a string synchronously.')
    },
    removeItem: (key) => expectSynchronousCompletion(removeItem(key, {})),
    setItem: (key, value) => expectSynchronousCompletion(setItem(key, value, {})),
  }
}
