import {getStorageAvailable, StorageType} from '../get-storage-available'

export const isStorageAvailable = (type: StorageType) => {
  const result = getStorageAvailable(type)

  return typeof result !== 'undefined'
}
