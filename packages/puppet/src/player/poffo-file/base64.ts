import {encodeBase64} from '../../encoding/encode-base64'
import {decodeDataUrl} from '../internal/decode-data-url'

interface DecodeAssetOptions {
  /** 파일 저장은 기본적으로 원문을 재현할 수 있는 정규 표기만 허용한다. false이면 생략된 패딩 등도 디코딩한다. */
  readonly canonical?: boolean
}

/** Decodes base64 data URLs; defaults to canonical encodings that round-trip byte-for-byte. */
export const decodeAsset = (source: string, options: DecodeAssetOptions = {}) => {
  const asset = decodeDataUrl(source)
  if (asset === undefined) {
    return undefined
  }
  try {
    const payload = source.slice(asset.prefix.length)
    return options.canonical === false || encodeBase64(asset.bytes) === payload
      ? {bytes: asset.bytes, prefix: asset.prefix}
      : undefined
  } catch {
    return undefined
  }
}

/** Recreates an embedded asset without a giant temporary binary string. */
export const encodeAsset = (prefix: string, bytes: Uint8Array): string =>
  prefix + encodeBase64(bytes)
