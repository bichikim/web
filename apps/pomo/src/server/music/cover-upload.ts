import {AwsClient} from 'aws4fetch'

const DEFAULT_BUCKET = 'pomofi-audio'
const DEFAULT_PUBLIC_ORIGIN = 'https://storage.pomofi.io'
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

interface StoreAlbumCoverInput {
  readonly body: ArrayBuffer
  readonly contentType: AlbumCoverContentType
}

interface StoreAlbumCoverOptions {
  readonly environment?: PublicAssetsEnvironment
  readonly fetcher?: typeof fetch
  readonly id?: string
  readonly signRequest?: (request: Request) => Promise<Request>
}

export interface StoredAlbumCover {
  readonly coverImageUrl: string
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

export const storeAlbumCover = async (
  input: StoreAlbumCoverInput,
  options: StoreAlbumCoverOptions = {},
): Promise<StoredAlbumCover> => {
  const environment = options.environment ?? process.env
  const accountId = requireEnvironmentValue(
    'CLOUDFLARE_R2_ACCOUNT_ID',
    environment.CLOUDFLARE_R2_ACCOUNT_ID,
  )
  const bucket = environment.POMO_PUBLIC_ASSETS_R2_BUCKET?.trim() || DEFAULT_BUCKET
  const publicOrigin = environment.POMO_PUBLIC_ASSETS_ORIGIN?.trim() || DEFAULT_PUBLIC_ORIGIN
  const objectId = options.id ?? crypto.randomUUID()
  const objectKey = `album-covers/${objectId}/cover.${CONTENT_TYPE_EXTENSIONS[input.contentType]}`
  const uploadUrl = new URL(
    `/${bucket}/${objectKey}`,
    `https://${accountId}.r2.cloudflarestorage.com`,
  )
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
    coverImageUrl: new URL(objectKey, `${publicOrigin.replace(/\/$/u, '')}/`).toString(),
  }
}
