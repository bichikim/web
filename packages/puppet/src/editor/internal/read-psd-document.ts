import type {ImportPsdResult} from '../../converter/psd/types'
import {importPsdSource} from '../../converter/import-psd-source'
import {encodePsdTexture} from './encode-psd-texture'

const readFile = (file: File): Promise<ArrayBuffer | undefined> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(undefined)
    reader.onload = () => resolve(reader.result instanceof ArrayBuffer ? reader.result : undefined)
    reader.readAsArrayBuffer(file)
  })

export const readPsdDocument = (file: File, signal?: AbortSignal): Promise<ImportPsdResult> =>
  importPsdSource({
    encodeTexture: encodePsdTexture,
    signal,
    source: {
      name: file.name,
      read: async () => {
        const bytes = await readFile(file)
        if (bytes === undefined) {
          throw new Error('PSD file read failed')
        }
        return bytes
      },
      size: file.size,
    },
  })
