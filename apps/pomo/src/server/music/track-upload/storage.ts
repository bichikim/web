import {AwsClient} from 'aws4fetch'

const DEFAULT_BUCKET = 'pomofi-paid-audio'
const STORAGE_PREFIX_SEGMENT_PATTERN = /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/u

export interface PaidAudioEnvironment {
  readonly CLOUDFLARE_R2_ACCOUNT_ID?: string
  readonly POMO_PAID_AUDIO_R2_ACCESS_KEY_ID?: string
  readonly POMO_PAID_AUDIO_R2_BUCKET?: string
  readonly POMO_PAID_AUDIO_R2_PREFIX?: string
  readonly POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY?: string
  readonly POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID?: string
  readonly POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY?: string
}

export interface TrackStorageOptions {
  readonly environment?: PaidAudioEnvironment
  readonly signRequest?: (request: Request, signQuery: boolean) => Promise<Request>
}

const requireEnvironmentValue = (
  name: keyof PaidAudioEnvironment,
  value: string | undefined,
): string => {
  const normalizedValue = value?.trim()

  if (normalizedValue === undefined || normalizedValue.length === 0) {
    throw new TypeError(`${name} is not set`)
  }

  return normalizedValue
}

const normalizeStoragePrefix = (value: string): string => {
  const trimmedValue = value.trim()
  let startIndex = 0

  while (trimmedValue[startIndex] === '/') {
    startIndex += 1
  }

  let endIndex = trimmedValue.length

  while (endIndex > startIndex && trimmedValue[endIndex - 1] === '/') {
    endIndex -= 1
  }

  return trimmedValue.slice(startIndex, endIndex)
}

const createStorageObjectKey = (objectKey: string, environment: PaidAudioEnvironment): string => {
  const normalizedPrefix = normalizeStoragePrefix(environment.POMO_PAID_AUDIO_R2_PREFIX ?? '')

  if (normalizedPrefix.length === 0) {
    return objectKey
  }

  if (
    normalizedPrefix.split('/').some((segment) => !STORAGE_PREFIX_SEGMENT_PATTERN.test(segment))
  ) {
    throw new TypeError('POMO_PAID_AUDIO_R2_PREFIX is invalid')
  }

  return `${normalizedPrefix}/${objectKey}`
}

export const createTrackObjectUrl = (objectKey: string, environment: PaidAudioEnvironment): URL => {
  const accountId = requireEnvironmentValue(
    'CLOUDFLARE_R2_ACCOUNT_ID',
    environment.CLOUDFLARE_R2_ACCOUNT_ID,
  )
  const bucket = environment.POMO_PAID_AUDIO_R2_BUCKET?.trim() || DEFAULT_BUCKET
  const storageObjectKey = createStorageObjectKey(objectKey, environment)
  return new URL(`/${bucket}/${storageObjectKey}`, `https://${accountId}.r2.cloudflarestorage.com`)
}

const createSigner = (environment: PaidAudioEnvironment) => {
  const client = new AwsClient({
    accessKeyId: requireEnvironmentValue(
      'POMO_PAID_AUDIO_R2_ACCESS_KEY_ID',
      environment.POMO_PAID_AUDIO_R2_ACCESS_KEY_ID ??
        environment.POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID,
    ),
    region: 'auto',
    secretAccessKey: requireEnvironmentValue(
      'POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY',
      environment.POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY ??
        environment.POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY,
    ),
    service: 's3',
  })

  return (request: Request, signQuery: boolean): Promise<Request> =>
    client.sign(request, {aws: {signQuery}})
}

export const signTrackObjectRequest = (
  request: Request,
  environment: PaidAudioEnvironment,
  signQuery: boolean,
  signer?: TrackStorageOptions['signRequest'],
) => (signer ?? createSigner(environment))(request, signQuery)
