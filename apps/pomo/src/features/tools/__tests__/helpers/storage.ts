import {vi} from 'vitest'
import {parseStorageJson} from 'src/utils/runtime-storage'
import {type ToolStorageAdapter} from '../../storage-adapter'

export const createStorageFixture = () => {
  const web = new Map<string, string>()
  const native = new Map<string, string>()
  const getItem = vi.fn(async (key: string): Promise<string | null> => native.get(key) ?? null)
  const setItem = vi.fn(async (key: string, value: string): Promise<void> => {
    native.set(key, value)
  })
  const usesTossStorage = vi.fn(() => false)
  const writeWeb = vi.fn((key: string, value: unknown): unknown | null => {
    web.set(key, JSON.stringify(value))
    return null
  })
  const removeWeb = vi.fn((key: string): unknown | null => {
    web.delete(key)
    return null
  })
  const adapter: ToolStorageAdapter = {
    readToss: async (key, parse) => parseStorageJson(await getItem(key), parse),
    readWeb: (key, parse) => parseStorageJson(web.get(key) ?? null, parse),
    removeWeb,
    usesTossStorage,
    writeToss: async (key, value) => setItem(key, JSON.stringify(value)),
    writeWeb,
  }
  return {adapter, getItem, removeWeb, setItem, usesTossStorage, web, writeWeb}
}
