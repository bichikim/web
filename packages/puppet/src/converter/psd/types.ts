import type {PixelData} from '../../mesh/generate-mesh'
import type {PuppetDocument} from '../../player/document'

export type ImportPsdErrorCode =
  | 'invalid-file'
  | 'read-failed'
  | 'decode-failed'
  | 'unsupported-mode'
  | 'too-large'
  | 'empty-document'

export interface ImportPsdSuccess {
  readonly ok: true
  readonly document: PuppetDocument
  readonly warnings: ReadonlyArray<string>
}

export interface ImportPsdFailure {
  readonly ok: false
  readonly error: {readonly code: ImportPsdErrorCode}
}

export type ImportPsdResult = ImportPsdSuccess | ImportPsdFailure

/** A borrowed input; reading does not grant permission to overwrite its origin. */
export interface PsdSource {
  /** Source filename recorded for later PSD reimport matching. */
  readonly name: string
  /** Byte count used to reject oversized inputs before reading. Actual bytes are checked again. */
  readonly size: number
  /** Reads this input independently; an optional signal cancels only this call. */
  readonly read: (signal?: AbortSignal) => Promise<ArrayBuffer | Uint8Array>
}

/** Encodes borrowed RGBA pixels as a PNG data URL without modifying their contents. */
export type PsdTextureEncoder = (pixels: PixelData) => Promise<string>

export interface ImportPsdSourceOptions {
  /** Input whose name and size are validated before its bytes are read. */
  readonly source: PsdSource
  /** Environment-specific PNG encoding; each import uses its own encoder. */
  readonly encodeTexture: PsdTextureEncoder
  /** When omitted, finish this independent import. Cancellation rejects with the signal reason. */
  readonly signal?: AbortSignal
}
