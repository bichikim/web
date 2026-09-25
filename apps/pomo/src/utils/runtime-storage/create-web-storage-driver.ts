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

/** Uses unstorage's localStorage driver while preserving synchronous browser reads and writes. */
export const createWebStorageDriver = (): SynchronousWebStorageDriver => {
  const driver = localStorageDriver({storage: localStorage})
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
