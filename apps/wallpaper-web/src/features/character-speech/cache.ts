import {failureResult, type Result, successResult} from '@winter-love/supertonic/result'
import type {CachedSpeech, SpeechCache} from './types'
import {parseMouthTrack} from './mouth-track'

const DATABASE = 'wallpaper-speech-clips'
const STORE = 'clips'

const openDatabase = (factory: () => IDBFactory) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory().open(DATABASE, 1)
    let failed = false
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      failed = true
      reject(new Error('Speech cache upgrade blocked'))
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => database.close()
      if (failed) {
        database.close()
      } else {
        resolve(database)
      }
    }
  })

const withStore = async <T>(
  factory: () => IDBFactory,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const database = await openDatabase(factory)
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode)
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Speech cache transaction aborted'))
      transaction.onerror = () => reject(transaction.error)
      const request = operation(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
    })
  } finally {
    database.close()
  }
}

const parseCachedSpeech = (value: unknown): CachedSpeech | null => {
  if (typeof value !== 'object' || value === null || !('audio' in value) || !('mouth' in value)) {
    return null
  }
  if (
    !(value.audio instanceof Blob) ||
    value.audio.type !== 'audio/mpeg' ||
    value.audio.size === 0
  ) {
    return null
  }
  const mouth = parseMouthTrack(value.mouth)
  return mouth === null ? null : {audio: value.audio, mouth}
}

/** IndexedDB 접근을 작업 시점까지 미루고 접근 거부도 기존 실패 결과로 반환한다. */
export const createSpeechCache = (factory: () => IDBFactory): SpeechCache => {
  const remove = async (key: string): Promise<Result<void, 'unavailable'>> => {
    try {
      await withStore(factory, 'readwrite', (store) => store.delete(key))
      return successResult(undefined)
    } catch (cause) {
      console.warn('Speech cache removal failed', cause)
      return failureResult('unavailable')
    }
  }

  const read = async (key: string): Promise<Result<CachedSpeech | null, 'unavailable'>> => {
    try {
      const value: unknown = await withStore(factory, 'readonly', (store) => store.get(key))
      if (value === undefined) {
        return successResult(null)
      }
      const parsed = parseCachedSpeech(value)
      if (parsed !== null) {
        return successResult(parsed)
      }
      await remove(key)
      return successResult(null)
    } catch (cause) {
      console.warn('Speech cache read failed', cause)
      return failureResult('unavailable')
    }
  }

  const write = async (key: string, clip: CachedSpeech): Promise<Result<void, 'unavailable'>> => {
    try {
      await withStore(factory, 'readwrite', (store) => store.put(clip, key))
      return successResult(undefined)
    } catch (cause) {
      console.warn('Speech cache write failed', cause)
      return failureResult('unavailable')
    }
  }

  return {read, remove, write}
}
