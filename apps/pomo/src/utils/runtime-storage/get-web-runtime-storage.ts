import {createWebStorageDriver} from './create-web-storage-driver'

const drivers = new WeakMap<Storage, ReturnType<typeof createWebStorageDriver>>()

/** Returns the synchronous driver for the current browser storage instance. */
export const getWebRuntimeStorage = (): ReturnType<typeof createWebStorageDriver> => {
  const storage = globalThis.localStorage
  const cached = drivers.get(storage)
  if (cached !== undefined) {
    return cached
  }
  const driver = createWebStorageDriver(storage)
  drivers.set(storage, driver)
  return driver
}
