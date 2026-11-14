/** Checks Blob storage without using album code and requests deletion after the transaction settles. */
export const checkBlobStorage = (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(`native-blob-baseline-${crypto.randomUUID()}`, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('blob')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('blob', 'readwrite')
      const finish = () => {
        database.close()
        indexedDB.deleteDatabase(database.name)
      }
      transaction.onabort = () => {
        const {error} = transaction
        finish()
        reject(error)
      }
      transaction.oncomplete = () => {
        finish()
        resolve()
      }
      transaction.objectStore('blob').put(new Blob(['baseline']), 'one')
    }
  })
