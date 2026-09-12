import type {TossStorage} from './types'

let tossStoragePromise: Promise<TossStorage> | null = null

export const loadTossStorage = (): Promise<TossStorage> => {
  tossStoragePromise ??= import('@apps-in-toss/web-framework').then(({Storage}) => Storage)
  return tossStoragePromise
}
