export interface PoffoAsset {
  readonly prefix: string
  readonly bytes: Uint8Array<ArrayBuffer>
}

export interface EncodedValue {
  readonly parts: ReadonlyArray<Uint8Array<ArrayBuffer>>
  readonly byteLength: number
  readonly assets: ReadonlyArray<PoffoAsset>
}

export type PoffoCodec = 0 | 1

/** Produces standard Brotli bytes and propagates stream cancellation to the source. */
export type PoffoCompressor = (
  source: ReadableStream<Uint8Array<ArrayBuffer>>,
) => Promise<ReadableStream<Uint8Array<ArrayBuffer>>>

export interface PoffoAssetEntry {
  readonly prefix: string
  readonly codec: PoffoCodec
  readonly encodedLength: number
  readonly decodedLength: number
  readonly sha256: string
}

export interface PoffoHeader {
  readonly indexHash: Uint8Array<ArrayBuffer>
  readonly indexLength: number
  readonly codec: PoffoCodec
  readonly encodedLength: number
  readonly decodedLength: number
  readonly assetCount: number
}
