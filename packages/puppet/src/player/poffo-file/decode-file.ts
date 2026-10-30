import {withAbort} from '../internal/with-abort'
import {decodeHeader, POFFO_HEADER_BYTES} from './header'
import {parseIndex} from './parse-index'
import {digest, digestHex} from './digest'
import {decodeSection} from './decode-section'
import {decodeValue} from './decode-value'
import {encodeAsset} from './base64'

const checkedSection = async (source: Blob, hash: string, signal?: AbortSignal): Promise<Blob> => {
  signal?.throwIfAborted()
  const actual = digestHex(await digest(source, signal))
  signal?.throwIfAborted()
  if (actual !== hash) {
    throw new SyntaxError('Poffo section checksum mismatch')
  }
  return source
}

/** Reads a complete v1 file by content, validating offsets, checksums, lengths and value tags. */
export const decodeFile = async (source: Blob, signal?: AbortSignal): Promise<unknown> => {
  signal?.throwIfAborted()
  const header = decodeHeader(
    new Uint8Array(
      await withAbort(() => source.slice(0, POFFO_HEADER_BYTES).arrayBuffer(), signal),
    ),
  )
  const indexEnd = POFFO_HEADER_BYTES + header.indexLength
  const metadataEnd = indexEnd + header.encodedLength
  if (
    metadataEnd > source.size ||
    (header.codec === 0 && header.encodedLength !== header.decodedLength)
  ) {
    throw new SyntaxError('Truncated Poffo file')
  }
  const indexBlob = await checkedSection(
    source.slice(POFFO_HEADER_BYTES, indexEnd),
    digestHex(header.indexHash),
    signal,
  )
  const index = parseIndex(await withAbort(() => indexBlob.text(), signal), header.assetCount)
  const expectedLength = index.assets.reduce(
    (length, asset) => length + asset.encodedLength,
    metadataEnd,
  )
  if (expectedLength !== source.size) {
    throw new SyntaxError('Truncated or trailing Poffo asset bytes')
  }
  const metadataBlob = await checkedSection(
    source.slice(indexEnd, metadataEnd),
    index.metadataSha256,
    signal,
  )
  const metadata = await decodeSection({
    codec: header.codec,
    decodedLength: header.decodedLength,
    signal,
    source: metadataBlob,
  })
  const assets: string[] = []
  let offset = metadataEnd
  // One decoded asset at a time avoids retaining all raw and encoded asset buffers together.
  for (const asset of index.assets) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await checkedSection(
      source.slice(offset, offset + asset.encodedLength),
      asset.sha256,
      signal,
    )
    // eslint-disable-next-line no-await-in-loop
    const bytes = await decodeSection({
      codec: asset.codec,
      decodedLength: asset.decodedLength,
      signal,
      source: blob,
    })
    signal?.throwIfAborted()
    assets.push(encodeAsset(asset.prefix, bytes))
    offset += asset.encodedLength
  }
  signal?.throwIfAborted()
  return decodeValue({assets, bytes: metadata})
}
