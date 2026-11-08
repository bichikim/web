import {readPsd} from 'ag-psd'
import {createPsdDocument} from './psd/create-psd-document'
import {MAXIMUM_PSD_BYTES, validatePsdSource} from './psd/validate-psd-source'
import type {ImportPsdResult, ImportPsdSourceOptions} from './psd/types'

const RGB_MODE = 3
const CHANNEL_BITS = 8

/** Imports a PSD through injected input and texture adapters, without using editor or DOM APIs. */
export const importPsdSource = async (
  options: ImportPsdSourceOptions,
): Promise<ImportPsdResult> => {
  const {source, encodeTexture, signal} = options
  signal?.throwIfAborted()
  const failure = validatePsdSource(source)
  if (failure !== undefined) {
    return failure
  }
  let bytes: ArrayBuffer | Uint8Array
  try {
    bytes = await source.read(signal)
  } catch {
    signal?.throwIfAborted()
    return {error: {code: 'read-failed'}, ok: false}
  }
  signal?.throwIfAborted()
  if (bytes.byteLength > MAXIMUM_PSD_BYTES) {
    return {error: {code: 'too-large'}, ok: false}
  }
  try {
    const psd = readPsd(bytes, {
      skipCompositeImageData: true,
      skipThumbnail: true,
      useRawData: true,
    })
    if (psd.bitsPerChannel !== CHANNEL_BITS || psd.colorMode !== RGB_MODE) {
      return {error: {code: 'unsupported-mode'}, ok: false}
    }
    const result = await createPsdDocument(psd, encodeTexture)
    signal?.throwIfAborted()
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
              : {...part.psdSource, documentId: source.name, fileName: source.name},
        })),
      },
    }
  } catch {
    signal?.throwIfAborted()
    return {error: {code: 'decode-failed'}, ok: false}
  }
}
