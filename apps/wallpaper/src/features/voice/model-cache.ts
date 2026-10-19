import Dexie, {type Table} from 'dexie'

interface ModelFile {
  readonly url: string
  readonly data: ArrayBuffer
}
interface ModelCache extends Dexie {
  readonly files: Table<ModelFile, string>
}

/** Stores immutable, revisioned Pomo model assets on this device. */
export const createModelCache = () => {
  const database = new Dexie('wallpaper-voice-models') as ModelCache
  database.version(1).stores({files: '&url'})
  const load = async (url: string): Promise<ArrayBuffer> => {
    const cached = await database.files.get(url).catch((cause: unknown) => {
      console.warn('Poffo voice cache read failed', cause)
      return undefined
    })
    if (cached !== undefined) {
      return cached.data
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`음성 모델 다운로드 실패 (${response.status})`)
    }
    const data = await response.arrayBuffer()
    await database.files.put({data, url}).catch((cause: unknown) => {
      console.warn('Poffo voice cache write failed', cause)
    })
    return data
  }
  return {close: () => database.close(), load}
}
