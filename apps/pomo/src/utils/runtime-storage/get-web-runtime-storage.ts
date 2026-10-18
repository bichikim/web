import {createWebStorageDriver} from './create-web-storage-driver'

const drivers = new WeakMap<Storage, ReturnType<typeof createWebStorageDriver>>()

/** 현재 브라우저 저장소 인스턴스의 동기 드라이버를 반환한다. */
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
