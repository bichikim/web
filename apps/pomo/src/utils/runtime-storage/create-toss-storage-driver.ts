import type {Driver} from 'unstorage'
import {loadTossStorage} from './load-toss-storage'

const getTossItem = async (key: string): Promise<string | null> =>
  (await loadTossStorage()).getItem(decodeURIComponent(key))

const getEncodedTossItem = async (key: string): Promise<string | null> => {
  const value = await getTossItem(key)
  return value === null ? null : JSON.stringify(value)
}

/** Connects the Apps in Toss key-value store to unstorage without loading its SDK on import. */
export const createTossStorageDriver = (): Driver => ({
  getItem: getEncodedTossItem,
  getKeys: () => {
    throw new Error('Apps in Toss Storage does not support listing keys.')
  },
  hasItem: async (key) => (await getTossItem(key)) !== null,
  name: 'apps-in-toss',
  setItem: async (key, value) => (await loadTossStorage()).setItem(decodeURIComponent(key), value),
})
