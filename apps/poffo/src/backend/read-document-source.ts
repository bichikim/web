import {
  importPsdSource,
  type PsdSource,
  type PsdTextureEncoder,
} from '@winter-love/puppet/converter'
import {parseDocumentBlob, type PuppetDocument} from '@winter-love/puppet/player'

export interface ReadDocumentSourceOptions {
  /** Borrowed PSD, JSON, or native Poffo input. */
  readonly source: PsdSource
  /** PNG encoder used when the source is a PSD. */
  readonly encodeTexture: PsdTextureEncoder
  /** Omitted, finish this independent read. */
  readonly signal?: AbortSignal
}

export interface DocumentReadSuccess {
  readonly ok: true
  readonly document: PuppetDocument
  readonly warnings: ReadonlyArray<string>
}

export interface DocumentReadFailure {
  readonly ok: false
  readonly error: {readonly code: string}
}

export type DocumentReadResult = DocumentReadSuccess | DocumentReadFailure

/** Applies the same parsing and validation to browser-selected files and path inputs. */
export const readDocumentSource = async (
  options: ReadDocumentSourceOptions,
): Promise<DocumentReadResult> => {
  const {source, signal} = options
  signal?.throwIfAborted()
  if (/\.psd$/iu.test(source.name)) {
    return importPsdSource(options)
  }
  let bytes: Uint8Array | ArrayBuffer
  try {
    bytes = await source.read(signal)
  } catch {
    signal?.throwIfAborted()
    return {error: {code: 'read-failed'}, ok: false}
  }
  signal?.throwIfAborted()
  const blob = new Blob([
    Uint8Array.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes),
  ])
  try {
    const result = await parseDocumentBlob({signal, source: blob})
    return result.ok ? {...result, warnings: []} : result
  } catch {
    signal?.throwIfAborted()
    return {error: {code: 'decode-failed'}, ok: false}
  }
}
