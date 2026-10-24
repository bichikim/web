import type {ImportPsdResult} from '../import-psd'

const RGB_MODE = 3
const CHANNEL_BITS = 8

const readFile = (file: File): Promise<ArrayBuffer | undefined> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(undefined)
    reader.onload = () => resolve(reader.result instanceof ArrayBuffer ? reader.result : undefined)
    reader.readAsArrayBuffer(file)
  })

export const readPsdDocument = async (file: File): Promise<ImportPsdResult> => {
  const bytes = await readFile(file)
  if (bytes === undefined) {
    return {error: {code: 'read-failed'}, ok: false}
  }
  try {
    const [{readPsd}, {createPsdDocument}] = await Promise.all([
      import('ag-psd'),
      import('./psd-document'),
    ])
    // Read dimensions before decompressing layer pixels.
    const psd = readPsd(bytes, {
      skipCompositeImageData: true,
      skipThumbnail: true,
      useRawData: true,
    })
    if (psd.bitsPerChannel !== CHANNEL_BITS || psd.colorMode !== RGB_MODE) {
      return {error: {code: 'unsupported-mode'}, ok: false}
    }
    const result = await createPsdDocument(psd)
    if (!result.ok) {
      return result
    }
    return {
      ...result,
      document: {
        ...result.document,
        parts: result.document.parts.map((part) => ({
          ...part,
          psdSource:
            part.psdSource === undefined
              ? undefined
              : {...part.psdSource, documentId: file.name, fileName: file.name},
        })),
      },
    }
  } catch {
    return {error: {code: 'decode-failed'}, ok: false}
  }
}
