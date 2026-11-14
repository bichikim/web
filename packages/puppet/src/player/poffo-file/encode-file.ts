import type {PuppetDocument} from '../document'
import {getExportDocument} from '../get-export-document'
import {encodeHeader, POFFO_MIME_TYPE} from './header'
import {encodeValue} from './encode-value'
import {encodeSection} from './encode-section'
import {digest, digestHex} from './digest'
import type {PoffoAssetEntry} from './types'

/** Saves the web Poffo v1 container without modifying its document or embedded asset bytes. */
export const encodeFile = async (document: PuppetDocument, signal?: AbortSignal): Promise<Blob> => {
  signal?.throwIfAborted()
  const value = encodeValue(getExportDocument(document))
  const metadata = await encodeSection(new Blob([...value.parts]), signal)
  const entries: PoffoAssetEntry[] = []
  const assets: Blob[] = []
  // Encoding sequential sections bounds WASM state and temporary asset memory.
  for (const asset of value.assets) {
    // eslint-disable-next-line no-await-in-loop
    const encoded = await encodeSection(new Blob([asset.bytes]), signal)
    // eslint-disable-next-line no-await-in-loop
    const hash = await digest(encoded.blob, signal)
    signal?.throwIfAborted()
    entries.push({
      codec: encoded.codec,
      decodedLength: asset.bytes.length,
      encodedLength: encoded.blob.size,
      prefix: asset.prefix,
      sha256: digestHex(hash),
    })
    assets.push(encoded.blob)
  }
  const metadataHash = await digest(metadata.blob, signal)
  const index = new Blob([
    JSON.stringify({assets: entries, metadataSha256: digestHex(metadataHash)}),
  ])
  const indexHash = await digest(index, signal)
  signal?.throwIfAborted()
  const header = encodeHeader({
    assetCount: entries.length,
    codec: metadata.codec,
    decodedLength: value.byteLength,
    encodedLength: metadata.blob.size,
    indexHash,
    indexLength: index.size,
  })
  return new Blob([header, index, metadata.blob, ...assets], {type: POFFO_MIME_TYPE})
}
