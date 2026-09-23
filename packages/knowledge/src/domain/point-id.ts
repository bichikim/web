import {createHash} from 'node:crypto'

export interface CreateKnowledgePointIdOptions {
  readonly docId: string
  readonly repoId: string
  readonly schemaVersion: number
  readonly unitId: string
  readonly workspaceId: string
}

const UUID_NAMESPACE = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex')
const UUID_BYTE_LENGTH = 16
const UUID_VARIANT_BYTE_INDEX = 8
const UUID_VARIANT_MODULUS = 64
const UUID_VARIANT_PREFIX = 128
const UUID_VERSION_BYTE_INDEX = 6
const UUID_VERSION_MODULUS = 16
const UUID_VERSION_PREFIX = 128
// oxlint-disable-next-line no-magic-numbers -- RFC 9562 UUID text group boundaries.
const UUID_SECTION_BOUNDARIES = [0, 8, 12, 16, 20, 32] as const

const formatUuid = (bytes: Uint8Array): string => {
  const hexadecimal = Buffer.from(bytes).toString('hex')

  return UUID_SECTION_BOUNDARIES.slice(0, -1)
    .map((start, index) => hexadecimal.slice(start, UUID_SECTION_BOUNDARIES[index + 1]))
    .join('-')
}

export const createKnowledgePointId = (options: CreateKnowledgePointIdOptions): string => {
  const name = JSON.stringify([
    options.schemaVersion,
    options.repoId,
    options.workspaceId,
    options.docId,
    options.unitId,
  ])
  const bytes = createHash('sha256')
    .update(UUID_NAMESPACE)
    .update(name, 'utf8')
    .digest()
    .subarray(0, UUID_BYTE_LENGTH)
  const versionByte = bytes.at(UUID_VERSION_BYTE_INDEX) ?? 0
  const variantByte = bytes.at(UUID_VARIANT_BYTE_INDEX) ?? 0

  bytes[UUID_VERSION_BYTE_INDEX] = (versionByte % UUID_VERSION_MODULUS) + UUID_VERSION_PREFIX
  bytes[UUID_VARIANT_BYTE_INDEX] = (variantByte % UUID_VARIANT_MODULUS) + UUID_VARIANT_PREFIX

  return formatUuid(bytes)
}
