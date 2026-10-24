const TOKEN_AUDIENCE = 'pomo-paid-audio'
const LEGACY_TOKEN_VERSION = 1
const SCOPED_TOKEN_VERSION = 2
const MINIMUM_SECRET_BYTES = 32
const MAXIMUM_TOKEN_LENGTH = 4096
const BASE64_BLOCK_SIZE = 4
const MILLISECONDS_PER_SECOND = 1000
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const OBJECT_KEY_REGEXP = new RegExp(
  `^tracks/(${UUID_PATTERN})/(${UUID_PATTERN})/source\\.mp3$`,
  'u',
)
const BASE64_URL_REGEXP = /^[A-Za-z0-9_-]+$/u

interface SerializedPlaybackClaimsBase {
  readonly assetId: string
  readonly aud: typeof TOKEN_AUDIENCE
  readonly exp: number
  readonly objectKey: string
}

interface SerializedLegacyPlaybackClaims extends SerializedPlaybackClaimsBase {
  readonly version: typeof LEGACY_TOKEN_VERSION
}

interface SerializedScopedPlaybackClaims extends SerializedPlaybackClaimsBase {
  readonly scope: PlaybackTokenScope
  readonly version: typeof SCOPED_TOKEN_VERSION
}

type SerializedPlaybackClaims = SerializedLegacyPlaybackClaims | SerializedScopedPlaybackClaims

export type PlaybackTokenScope = 'full' | 'preview'

export interface PlaybackTokenClaims {
  readonly assetId: string
  readonly expiresAt: Date
  readonly objectKey: string
  readonly scope: PlaybackTokenScope
}

export interface CreatePlaybackTokenOptions extends PlaybackTokenClaims {
  readonly secret: string
}

export interface VerifyPlaybackTokenOptions {
  readonly now?: Date
  readonly secret: string
  readonly scope: PlaybackTokenScope
}

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCodePoint(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

const decodeBase64Url = (value: string): Uint8Array<ArrayBuffer> | null => {
  if (!BASE64_URL_REGEXP.test(value)) {
    return null
  }

  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padding = '='.repeat(
    (BASE64_BLOCK_SIZE - (base64.length % BASE64_BLOCK_SIZE)) % BASE64_BLOCK_SIZE,
  )

  try {
    const decoded = atob(`${base64}${padding}`)
    const bytes = new Uint8Array(decoded.length)

    for (const [index, character] of [...decoded].entries()) {
      bytes[index] = character.codePointAt(0) ?? 0
    }

    return bytes
  } catch {
    return null
  }
}

const importSecret = (secret: string): Promise<CryptoKey> => {
  const secretBytes = new TextEncoder().encode(secret)

  if (secretBytes.byteLength < MINIMUM_SECRET_BYTES) {
    throw new TypeError('Playback token secret must contain at least 32 bytes')
  }

  return crypto.subtle.importKey('raw', secretBytes, {hash: 'SHA-256', name: 'HMAC'}, false, [
    'sign',
    'verify',
  ])
}

const parseObjectKey = (objectKey: string): {readonly assetId: string} | null => {
  const match = OBJECT_KEY_REGEXP.exec(objectKey)

  return match === null || match[2] === undefined ? null : {assetId: match[2]}
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const parseClaims = (value: unknown): SerializedPlaybackClaims | null => {
  if (!isRecord(value)) {
    return null
  }

  const {assetId, aud, exp, objectKey, scope, version} = value
  const parsedKey = typeof objectKey === 'string' ? parseObjectKey(objectKey) : null

  if (
    typeof assetId !== 'string' ||
    typeof objectKey !== 'string' ||
    parsedKey?.assetId !== assetId ||
    aud !== TOKEN_AUDIENCE ||
    typeof exp !== 'number' ||
    !Number.isSafeInteger(exp) ||
    (version !== LEGACY_TOKEN_VERSION && version !== SCOPED_TOKEN_VERSION)
  ) {
    return null
  }

  if (version === LEGACY_TOKEN_VERSION) {
    return scope === undefined
      ? {assetId, aud, exp, objectKey, version: LEGACY_TOKEN_VERSION}
      : null
  }

  return scope === 'full' || scope === 'preview'
    ? {assetId, aud, exp, objectKey, scope, version: SCOPED_TOKEN_VERSION}
    : null
}

const serializeClaims = (options: PlaybackTokenClaims): SerializedPlaybackClaims => {
  const parsedKey = parseObjectKey(options.objectKey)

  if (parsedKey?.assetId !== options.assetId) {
    throw new TypeError('Playback token asset does not match its immutable object key')
  }

  const exp = Math.floor(options.expiresAt.getTime() / MILLISECONDS_PER_SECOND)

  if (!Number.isSafeInteger(exp)) {
    throw new TypeError('Playback token expiration is invalid')
  }

  const baseClaims: SerializedPlaybackClaimsBase = {
    assetId: options.assetId,
    aud: TOKEN_AUDIENCE,
    exp,
    objectKey: options.objectKey,
  }

  // Full playback remains v1 until every independently deployed gateway accepts scoped tokens.
  return options.scope === 'full'
    ? {...baseClaims, version: LEGACY_TOKEN_VERSION}
    : {...baseClaims, scope: options.scope, version: SCOPED_TOKEN_VERSION}
}

export const createPlaybackToken = async (options: CreatePlaybackTokenOptions): Promise<string> => {
  const payload = new TextEncoder().encode(JSON.stringify(serializeClaims(options)))
  const encodedPayload = encodeBase64Url(payload)
  const key = await importSecret(options.secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload))

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`
}

export const verifyPlaybackToken = async (
  token: string,
  options: VerifyPlaybackTokenOptions,
): Promise<PlaybackTokenClaims | null> => {
  if (token.length > MAXIMUM_TOKEN_LENGTH) {
    return null
  }

  const [encodedPayload, encodedSignature, trailingPart] = token.split('.')

  if (
    encodedPayload === undefined ||
    encodedSignature === undefined ||
    trailingPart !== undefined
  ) {
    return null
  }

  const payload = decodeBase64Url(encodedPayload)
  const signature = decodeBase64Url(encodedSignature)

  if (payload === null || signature === null) {
    return null
  }

  const key = await importSecret(options.secret)
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(encodedPayload),
  )

  if (!isValid) {
    return null
  }

  let claims: SerializedPlaybackClaims | null

  try {
    claims = parseClaims(JSON.parse(new TextDecoder().decode(payload)))
  } catch {
    return null
  }

  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / MILLISECONDS_PER_SECOND)

  if (claims === null || claims.exp <= nowSeconds) {
    return null
  }

  const scope = claims.version === LEGACY_TOKEN_VERSION ? 'full' : claims.scope

  return scope === options.scope
    ? {
        assetId: claims.assetId,
        expiresAt: new Date(claims.exp * MILLISECONDS_PER_SECOND),
        objectKey: claims.objectKey,
        scope,
      }
    : null
}
