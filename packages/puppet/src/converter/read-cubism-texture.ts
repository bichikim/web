/* eslint-disable no-magic-numbers -- PNG signature and IHDR offsets. */
import type {PuppetPart} from '../player/document'
import {encodeBase64} from '../encoding/encode-base64'

/** Embeds a Cubism PNG texture, validating its signature and dimensions. */
export const readCubismTexture = (source: Uint8Array): PuppetPart['texture'] => {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (
    source.length < 33 ||
    !signature.every((value, index) => source[index] === value) ||
    new TextDecoder().decode(source.subarray(12, 16)) !== 'IHDR'
  ) {
    throw new Error('Cubism texture must be a PNG image')
  }
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength)
  const width = view.getUint32(16, false)
  const height = view.getUint32(20, false)
  if (width === 0 || height === 0) {
    throw new Error('Cubism texture has invalid dimensions')
  }
  return {height, src: `data:image/png;base64,${encodeBase64(source)}`, width}
}
