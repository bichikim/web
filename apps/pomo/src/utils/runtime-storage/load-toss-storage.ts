import type {TossStorage} from './types'

let tossStoragePromise: Promise<TossStorage> | null = null

export const loadTossStorage = (): Promise<TossStorage> => {
  tossStoragePromise ??= import('@apps-in-toss/web-framework').then(({Storage}) => ({
    getItem: (key) => Storage.getItem(key),
    setItem: (key, value) => Storage.setItem(key, value),
  }))
  return tossStoragePromise
}
