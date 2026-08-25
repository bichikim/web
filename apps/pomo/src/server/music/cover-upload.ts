import {AwsClient} from 'aws4fetch'

const DEFAULT_BUCKET = 'pomofi-audio'
const DEFAULT_PUBLIC_ORIGIN = 'https://storage.pomofi.io'
const HTTP_NOT_FOUND = 404
const CONTENT_TYPE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

type AlbumCoverContentType = keyof typeof CONTENT_TYPE_EXTENSIONS

interface PublicAssetsEnvironment {
  readonly CLOUDFLARE_R2_ACCOUNT_ID?: string
  readonly POMO_PUBLIC_ASSETS_ORIGIN?: string
  readonly POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID?: string
  readonly POMO_PUBLIC_ASSETS_R2_BUCKET?: string
  readonly POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY?: string
}

interface StoreArtworkInput {
  readonly body: ArrayBuffer
  readonly contentType: AlbumCoverContentType
}

interface StoreAlbumCoverOptions {
  readonly environment?: PublicAssetsEnvironment
  readonly fetcher?: typeof fetch
  readonly id?: string
  readonly signRequest?: (request: Request) => Promise<Request>
}

interface StoreTrackArtworkOptions {
  readonly environment?: PublicAssetsEnvironment
  readonly fetcher?: typeof fetch
  readonly signRequest?: (request: Request) => Promise<Request>
}

export interface StoredAlbumCover {
  readonly coverImageUrl: string
}

export interface StoredTrackArtwork {
  readonly artworkUrl: string
}

const requireEnvironmentValue = (
  name: keyof PublicAssetsEnvironment,
  value: string | undefined,
): string => {
  const normalizedValue = value?.trim()

  if (normalizedValue === undefined || normalizedValue.length === 0) {
    throw new TypeError(`${name} is not set`)
  }

  return normalizedValue
}

const createSigner = (environment: PublicAssetsEnvironment) => {
  const client = new AwsClient({
    accessKeyId: requireEnvironmentValue(
      'POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID',
      environment.POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID,
    ),
    region: 'auto',
    secretAccessKey: requireEnvironmentValue(
      'POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY',
      environment.POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY,
    ),
    service: 's3',
  })

  return (request: Request): Promise<Request> => client.sign(request)
}

const createPublicObjectUrl = (
  objectKey: string,
  environment: PublicAssetsEnvironment,
): {readonly publicUrl: string; readonly uploadUrl: URL} => {
  const accountId = requireEnvironmentValue(
    'CLOUDFLARE_R2_ACCOUNT_ID',
    environment.CLOUDFLARE_R2_ACCOUNT_ID,
  )
  const bucket = environment.POMO_PUBLIC_ASSETS_R2_BUCKET?.trim() || DEFAULT_BUCKET
  const publicOrigin = environment.POMO_PUBLIC_ASSETS_ORIGIN?.trim() || DEFAULT_PUBLIC_ORIGIN

  return {
    publicUrl: new URL(objectKey, `${publicOrigin.replace(/\/$/u, '')}/`).toString(),
    uploadUrl: new URL(`/${bucket}/${objectKey}`, `https://${accountId}.r2.cloudflarestorage.com`),
  }
}

export const storeAlbumCover = async (
  input: StoreArtworkInput,
  options: StoreAlbumCoverOptions = {},
): Promise<StoredAlbumCover> => {
  const environment = options.environment ?? process.env
  const objectId = options.id ?? crypto.randomUUID()
  const objectKey = `album-covers/${objectId}/cover.${CONTENT_TYPE_EXTENSIONS[input.contentType]}`
  const {publicUrl, uploadUrl} = createPublicObjectUrl(objectKey, environment)
  const request = new Request(uploadUrl, {
    body: input.body,
    headers: {'Content-Type': input.contentType},
    method: 'PUT',
  })
  const signedRequest = await (options.signRequest ?? createSigner(environment))(request)
  const response = await (options.fetcher ?? fetch)(signedRequest)

  if (!response.ok) {
    throw new Error(`R2 cover upload failed with status ${response.status}`)
  }

  return {
    coverImageUrl: publicUrl,
  }
}

export const storeTrackArtwork = async (
  assetId: string,
  input: StoreArtworkInput,
  options: StoreTrackArtworkOptions = {},
): Promise<StoredTrackArtwork> => {
  const environment = options.environment ?? process.env
  const objectKey = `track-artwork/${assetId}/cover`
  const {publicUrl, uploadUrl} = createPublicObjectUrl(objectKey, environment)
  const request = new Request(uploadUrl, {
    body: input.body,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': input.contentType,
    },
    method: 'PUT',
  })
  const signedRequest = await (options.signRequest ?? createSigner(environment))(request)
  const response = await (options.fetcher ?? fetch)(signedRequest)

  if (!response.ok) {
    throw new Error(`R2 track artwork upload failed with status ${response.status}`)
  }

  return {artworkUrl: publicUrl}
}

export const deleteTrackArtwork = async (
  assetId: string,
  options: StoreTrackArtworkOptions = {},
): Promise<void> => {
  const environment = options.environment ?? process.env
  const objectKey = `track-artwork/${assetId}/cover`
  const {uploadUrl} = createPublicObjectUrl(objectKey, environment)
  const request = new Request(uploadUrl, {method: 'DELETE'})
  const signedRequest = await (options.signRequest ?? createSigner(environment))(request)
  const response = await (options.fetcher ?? fetch)(signedRequest)

  if (!response.ok && response.status !== HTTP_NOT_FOUND) {
    throw new Error(`R2 track artwork delete failed with status ${response.status}`)
  }
}
