import {AwsClient} from 'aws4fetch'

import {AI_OPERATIONAL_LIMITS, getAiDownloadExpiry} from './policy.ts'

const DEFAULT_BUCKET = 'pomofi-private-ai'
const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu
const PREFIX_SEGMENT_PATTERN = /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/u
const ARTIFACT_FILENAME_PATTERN = /^[a-z\d][a-z\d._-]{0,127}$/iu
const ARTIFACT_KEY_SEGMENT_COUNT = 5
const INTERMEDIATE_OBJECT_KEY_PREFIX = 'ai/intermediate'
const INTERMEDIATE_OBJECT_KEY_PREFIX_PATTERN =
  /^ai\/intermediate\/[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu
const MAXIMUM_OBJECT_LIST_PAGES = 10
const HTTP_NOT_FOUND = 404
const MAXIMUM_DELETE_ATTEMPTS = 3
const STORAGE_TIMEOUT_MS = 30_000
const MILLISECONDS_PER_SECOND = 1000

export interface AiArtifactEnvironment {
  readonly CLOUDFLARE_R2_ACCOUNT_ID?: string
  readonly POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID?: string
  readonly POMO_AI_ARTIFACT_R2_BUCKET?: string
  readonly POMO_AI_ARTIFACT_R2_PREFIX?: string
  readonly POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY?: string
}

export interface AiArtifactStorageOptions {
  readonly environment?: AiArtifactEnvironment
  readonly expiresAt?: Date | null
  readonly fetcher?: typeof fetch
  readonly now?: Date
  readonly signal?: AbortSignal
  readonly signRequest?: (request: Request, signQuery: boolean) => Promise<Request>
}

const createStorageFetcher = (options: AiArtifactStorageOptions) => {
  const deadline = AbortSignal.timeout(STORAGE_TIMEOUT_MS)
  const signal =
    options.signal === undefined ? deadline : AbortSignal.any([deadline, options.signal])
  return (request: Request): Promise<Response> => {
    signal.throwIfAborted()
    return (options.fetcher ?? fetch)(new Request(request, {signal}))
  }
}

const requireEnvironmentValue = (
  name: keyof AiArtifactEnvironment,
  value: string | undefined,
): string => {
  const normalized = value?.trim()
  if (normalized === undefined || normalized.length === 0) {
    throw new TypeError(`${name} is not set`)
  }

  return normalized
}

const normalizePrefix = (value: string): string => {
  const trimmed = value.trim().replace(/^\/+|\/+$/gu, '')
  if (
    trimmed.length > 0 &&
    trimmed.split('/').some((segment) => !PREFIX_SEGMENT_PATTERN.test(segment))
  ) {
    throw new TypeError('POMO_AI_ARTIFACT_R2_PREFIX is invalid')
  }

  return trimmed
}

const normalizeJobId = (jobId: string): string => {
  if (!UUID_PATTERN.test(jobId)) {
    throw new TypeError('jobId must be a UUID')
  }

  return jobId.toLowerCase()
}

/** Creates the runner-only namespace for raw and intermediate files. */
export const createAiArtifactIntermediateObjectKeyPrefix = (jobId: string): string =>
  `${INTERMEDIATE_OBJECT_KEY_PREFIX}/${normalizeJobId(jobId)}`

export const assertAiArtifactIntermediateObjectKeyPrefix = (objectKeyPrefix: string): string => {
  if (!INTERMEDIATE_OBJECT_KEY_PREFIX_PATTERN.test(objectKeyPrefix)) {
    throw new TypeError('invalid_ai_intermediate_object_key_prefix')
  }

  return objectKeyPrefix
}

const assertAiArtifactIntermediateObjectKey = (objectKey: string): string => {
  const segments = objectKey.split('/')
  const [root, intermediate, jobId, ...filenameSegments] = segments
  if (
    root !== 'ai' ||
    intermediate !== 'intermediate' ||
    !UUID_PATTERN.test(jobId ?? '') ||
    filenameSegments.length === 0 ||
    filenameSegments.some((segment) => !ARTIFACT_FILENAME_PATTERN.test(segment))
  ) {
    throw new TypeError('invalid_ai_intermediate_object_key')
  }

  return objectKey
}

const assertAiArtifactStorageObjectKey = (objectKey: string): string =>
  objectKey.startsWith(`${INTERMEDIATE_OBJECT_KEY_PREFIX}/`)
    ? assertAiArtifactIntermediateObjectKey(objectKey)
    : assertAiArtifactObjectKey(objectKey)

/** Creates a private R2 key with a lifecycle namespace that cannot be confused with an archive. */
export const createAiArtifactObjectKey = (
  jobId: string,
  lifecycle: 'archive' | 'temporary',
  filename: string,
): string => {
  const normalizedFilename = filename.trim()
  if (!ARTIFACT_FILENAME_PATTERN.test(normalizedFilename)) {
    throw new TypeError('filename must be a single safe artifact segment')
  }

  return `ai/jobs/${normalizeJobId(jobId)}/${lifecycle}/${normalizedFilename}`
}

/** Validates that an artifact key belongs to the private AI job namespace. */
export const assertAiArtifactObjectKey = (objectKey: string): string => {
  const segments = objectKey.split('/')
  const [root, jobs, jobId, lifecycle, filename] = segments
  if (
    segments.length !== ARTIFACT_KEY_SEGMENT_COUNT ||
    root !== 'ai' ||
    jobs !== 'jobs' ||
    !UUID_PATTERN.test(jobId ?? '') ||
    (lifecycle !== 'archive' && lifecycle !== 'temporary') ||
    !ARTIFACT_FILENAME_PATTERN.test(filename ?? '')
  ) {
    throw new TypeError('invalid_ai_artifact_object_key')
  }

  return objectKey
}

export const getAiArtifactJobId = (objectKey: string): string => {
  assertAiArtifactObjectKey(objectKey)
  return objectKey.split('/')[2] ?? ''
}

export const getAiArtifactLifecycle = (objectKey: string): 'archive' | 'temporary' => {
  assertAiArtifactObjectKey(objectKey)
  return objectKey.split('/')[3] as 'archive' | 'temporary'
}

export const getAiArtifactFilename = (objectKey: string): string => {
  assertAiArtifactObjectKey(objectKey)
  return objectKey.split('/')[4] ?? ''
}

const createStorageObjectKey = (objectKey: string, environment: AiArtifactEnvironment): string => {
  const prefix = normalizePrefix(environment.POMO_AI_ARTIFACT_R2_PREFIX ?? '')
  return prefix.length === 0 ? objectKey : `${prefix}/${objectKey}`
}

const createBucketUrl = (environment: AiArtifactEnvironment): URL => {
  const accountId = requireEnvironmentValue(
    'CLOUDFLARE_R2_ACCOUNT_ID',
    environment.CLOUDFLARE_R2_ACCOUNT_ID,
  )
  const bucket = environment.POMO_AI_ARTIFACT_R2_BUCKET?.trim() || DEFAULT_BUCKET
  return new URL(`/${bucket}`, `https://${accountId}.r2.cloudflarestorage.com`)
}

export const createAiArtifactObjectUrl = (
  objectKey: string,
  environment: AiArtifactEnvironment,
): URL => {
  assertAiArtifactStorageObjectKey(objectKey)
  const objectUrl = createBucketUrl(environment)
  objectUrl.pathname = `${objectUrl.pathname.replace(/\/$/u, '')}/${createStorageObjectKey(objectKey, environment)}`
  return objectUrl
}

const createSigner = (environment: AiArtifactEnvironment) => {
  const client = new AwsClient({
    accessKeyId: requireEnvironmentValue(
      'POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID',
      environment.POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID,
    ),
    region: 'auto',
    secretAccessKey: requireEnvironmentValue(
      'POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY',
      environment.POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY,
    ),
    service: 's3',
  })

  return (request: Request, signQuery: boolean): Promise<Request> =>
    client.sign(request, {aws: {signQuery}})
}

const signAiArtifactRequest = (
  request: Request,
  environment: AiArtifactEnvironment,
  signQuery: boolean,
  signer?: AiArtifactStorageOptions['signRequest'],
): Promise<Request> => (signer ?? createSigner(environment))(request, signQuery)

export const createAiArtifactDownloadUrl = async (
  objectKey: string,
  options: AiArtifactStorageOptions = {},
): Promise<{readonly expiresAt: Date; readonly url: string}> => {
  const environment = options.environment ?? process.env
  const now = options.now ?? new Date()
  assertAiArtifactObjectKey(objectKey)
  const policyExpiry = getAiDownloadExpiry(now)
  const expiresAt =
    options.expiresAt === undefined || options.expiresAt === null
      ? policyExpiry
      : new Date(Math.min(policyExpiry.getTime(), options.expiresAt.getTime()))
  const expiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / MILLISECONDS_PER_SECOND)
  if (expiresIn < 1) {
    throw new Error('AI artifact expires before a usable download URL can be created')
  }

  const objectUrl = createAiArtifactObjectUrl(objectKey, environment)
  objectUrl.searchParams.set('X-Amz-Expires', expiresIn.toString())
  const signedRequest = await signAiArtifactRequest(
    new Request(objectUrl),
    environment,
    true,
    options.signRequest,
  )

  return {
    expiresAt: new Date(now.getTime() + expiresIn * MILLISECONDS_PER_SECOND),
    url: signedRequest.url,
  }
}

export const deleteAiArtifactObject = async (
  objectKey: string,
  options: AiArtifactStorageOptions = {},
): Promise<void> => {
  const environment = options.environment ?? process.env
  assertAiArtifactStorageObjectKey(objectKey)
  const fetcher = createStorageFetcher(options)
  for (let attempt = 0; attempt < MAXIMUM_DELETE_ATTEMPTS; attempt += 1) {
    const request = new Request(createAiArtifactObjectUrl(objectKey, environment), {
      method: 'DELETE',
    })
    // oxlint-disable-next-line no-await-in-loop -- A delete retry must observe the previous response.
    const signedRequest = await signAiArtifactRequest(
      request,
      environment,
      false,
      options.signRequest,
    )
    // oxlint-disable-next-line no-await-in-loop -- Bounded deletion retries are part of the cleanup contract.
    const response = await fetcher(signedRequest)
    if (response.ok || response.status === HTTP_NOT_FOUND) {
      return
    }

    if (attempt === MAXIMUM_DELETE_ATTEMPTS - 1) {
      throw new Error(`AI artifact delete failed with status ${response.status}`)
    }
  }
}

export const copyAiArtifactObject = async (
  sourceObjectKey: string,
  destinationObjectKey: string,
  options: AiArtifactStorageOptions = {},
): Promise<void> => {
  const environment = options.environment ?? process.env
  const fetcher = createStorageFetcher(options)
  assertAiArtifactObjectKey(sourceObjectKey)
  assertAiArtifactObjectKey(destinationObjectKey)
  const bucket = environment.POMO_AI_ARTIFACT_R2_BUCKET?.trim() || DEFAULT_BUCKET
  const sourceKey = createStorageObjectKey(sourceObjectKey, environment)
  const destinationRequest = new Request(
    createAiArtifactObjectUrl(destinationObjectKey, environment),
    {
      headers: {'x-amz-copy-source': `/${bucket}/${sourceKey}`},
      method: 'PUT',
    },
  )
  const signedRequest = await signAiArtifactRequest(
    destinationRequest,
    environment,
    false,
    options.signRequest,
  )
  const response = await fetcher(signedRequest)
  if (!response.ok) {
    throw new Error(`AI artifact copy failed with status ${response.status}`)
  }
}

const decodeXmlText = (value: string): string =>
  value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&')

const readXmlValues = (xml: string, tag: string): Array<string> => {
  const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'gu')
  return Array.from(xml.matchAll(pattern), ([, value]) => decodeXmlText(value ?? ''))
}

const listAiArtifactObjectKeys = async (
  objectKeyPrefix: string,
  options: AiArtifactStorageOptions = {},
): Promise<ReadonlyArray<string>> => {
  const fetcher = createStorageFetcher(options)
  const environment = options.environment ?? process.env
  const storagePrefix = createStorageObjectKey(`${objectKeyPrefix}/`, environment)
  const objectKeys: Array<string> = []
  let continuationToken: string | undefined

  for (let page = 0; page < MAXIMUM_OBJECT_LIST_PAGES; page += 1) {
    const listUrl = createBucketUrl(environment)
    listUrl.searchParams.set('list-type', '2')
    listUrl.searchParams.set('prefix', storagePrefix)
    if (continuationToken !== undefined) {
      listUrl.searchParams.set('continuation-token', continuationToken)
    }

    // oxlint-disable-next-line no-await-in-loop -- Each page needs the previous continuation token.
    const signedRequest = await signAiArtifactRequest(
      new Request(listUrl),
      environment,
      false,
      options.signRequest,
    )
    // oxlint-disable-next-line no-await-in-loop -- Each page needs the previous continuation token.
    const response = await fetcher(signedRequest)
    if (!response.ok) {
      throw new Error(`AI artifact list failed with status ${response.status}`)
    }

    // oxlint-disable-next-line no-await-in-loop -- Each page needs the previous continuation token.
    const xml = await response.text()
    for (const storedKey of readXmlValues(xml, 'Key')) {
      if (!storedKey.startsWith(storagePrefix)) {
        throw new Error('AI artifact list returned an object outside the requested prefix')
      }

      const objectKey = `${objectKeyPrefix}/${storedKey.slice(storagePrefix.length)}`
      objectKeys.push(assertAiArtifactStorageObjectKey(objectKey))
    }

    const [isTruncated] = readXmlValues(xml, 'IsTruncated')
    if (isTruncated !== 'true') {
      return objectKeys
    }

    const [nextToken] = readXmlValues(xml, 'NextContinuationToken')
    if (nextToken === undefined || nextToken.length === 0) {
      throw new Error('AI artifact list response omitted its continuation token')
    }
    continuationToken = nextToken
  }

  throw new Error('AI artifact list exceeded the page limit')
}

/** Lists runner intermediates for the specified job prefix. */
export const listAiArtifactIntermediateObjectKeys = (
  objectKeyPrefix: string,
  options: AiArtifactStorageOptions = {},
): Promise<ReadonlyArray<string>> => {
  assertAiArtifactIntermediateObjectKeyPrefix(objectKeyPrefix)
  return listAiArtifactObjectKeys(objectKeyPrefix, options)
}

/** Lists temporary final results belonging to one job. */
export const listAiArtifactTemporaryObjectKeys = (
  jobId: string,
  options: AiArtifactStorageOptions = {},
): Promise<ReadonlyArray<string>> =>
  listAiArtifactObjectKeys(`ai/jobs/${normalizeJobId(jobId)}/temporary`, options)
