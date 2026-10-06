import {vi} from 'vitest'
export const resetCustomAlbumDatabase = async (): Promise<void> => {
  try {
    const {openCustomAlbumDatabase} = await import('src/features/custom-albums/database')
    const database = await openCustomAlbumDatabase()
    database.close()

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('pomo-custom-albums')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Custom album database deletion was blocked.'))
    })
  } finally {
    vi.resetModules()
  }
}
