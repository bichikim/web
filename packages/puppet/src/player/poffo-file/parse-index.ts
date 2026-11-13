import type {PoffoAssetEntry} from './types'

interface PoffoIndex {
  readonly metadataSha256: string
  readonly assets: ReadonlyArray<PoffoAssetEntry>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const UINT32_MAXIMUM = 4_294_967_295
const isLength = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= UINT32_MAXIMUM
const isHash = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value)
const isAsset = (value: unknown): value is PoffoAssetEntry =>
  isRecord(value) &&
  typeof value.prefix === 'string' &&
  /^data:[^,]*;base64,$/iu.test(value.prefix) &&
  (value.codec === 0 || value.codec === 1) &&
  isLength(value.encodedLength) &&
  isLength(value.decodedLength) &&
  (value.codec !== 0 || value.encodedLength === value.decodedLength) &&
  isHash(value.sha256)

/** Validates the untrusted JSON index before interpreting any section offsets. */
export const parseIndex = (source: string, assetCount: number): PoffoIndex => {
  const value: unknown = JSON.parse(source)
  if (
    !isRecord(value) ||
    !isHash(value.metadataSha256) ||
    !Array.isArray(value.assets) ||
    value.assets.length !== assetCount ||
    !value.assets.every(isAsset)
  ) {
    throw new SyntaxError('Invalid Poffo asset index')
  }
  return {assets: value.assets, metadataSha256: value.metadataSha256}
}
