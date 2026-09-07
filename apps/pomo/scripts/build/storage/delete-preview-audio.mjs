import {pathToFileURL} from 'node:url'

import {AwsClient} from 'aws4fetch'

const PREVIEW_PREFIX_PATTERN = /^previews\/pr-\d+\/$/u

/** @typedef {{sign: (request: Request) => Promise<Request>}} RequestSigner */

const requireValue = (value, name) => {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new TypeError(`${name} is required.`)
  }

  return normalizedValue
}

const decodeXmlValue = (value) =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')

const readXmlValues = (xml, tagName) => {
  const expression = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'gu')
  return Array.from(xml.matchAll(expression), (match) => decodeXmlValue(match[1] ?? ''))
}

const escapeXmlValue = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

/** @returns {RequestSigner} */
const createSigner = ({accessKeyId, secretAccessKey}) =>
  new AwsClient({accessKeyId, region: 'auto', secretAccessKey, service: 's3'})

const requestR2 = async (request, signer, fetchImplementation) => {
  const signedRequest = await signer.sign(request)
  return fetchImplementation(signedRequest)
}

const listPreviewKeys = async ({bucketUrl, fetchImplementation, prefix, signer}) => {
  const url = new URL(bucketUrl)
  url.searchParams.set('encoding-type', 'url')
  url.searchParams.set('list-type', '2')
  url.searchParams.set('max-keys', '1000')
  url.searchParams.set('prefix', prefix)
  const response = await requestR2(new Request(url), signer, fetchImplementation)

  if (!response.ok) {
    throw new Error(`R2 Preview object listing failed with status ${response.status}.`)
  }

  const xml = await response.text()
  return readXmlValues(xml, 'Key').map((key) => decodeURIComponent(key))
}

const deletePreviewKeys = async ({bucketUrl, fetchImplementation, keys, signer}) => {
  const body = `<Delete>${keys
    .map((key) => `<Object><Key>${escapeXmlValue(key)}</Key></Object>`)
    .join('')}<Quiet>true</Quiet></Delete>`
  const url = new URL(bucketUrl)
  url.searchParams.set('delete', '')
  const request = new Request(url, {
    body,
    headers: {'Content-Type': 'application/xml'},
    method: 'POST',
  })
  const response = await requestR2(request, signer, fetchImplementation)

  if (!response.ok) {
    throw new Error(`R2 Preview object deletion failed with status ${response.status}.`)
  }

  const responseBody = await response.text()

  if (responseBody.includes('<Error>')) {
    throw new Error('R2 Preview object deletion returned an object error.')
  }
}

const deletePreviewBatches = async ({
  bucketUrl,
  deletedCount = 0,
  fetchImplementation,
  prefix,
  signer,
  write,
}) => {
  const keys = await listPreviewKeys({bucketUrl, fetchImplementation, prefix, signer})

  if (keys.length === 0) {
    write(`Deleted ${deletedCount} R2 Preview objects under ${prefix}.`)
    return deletedCount
  }

  await deletePreviewKeys({bucketUrl, fetchImplementation, keys, signer})
  return deletePreviewBatches({
    bucketUrl,
    deletedCount: deletedCount + keys.length,
    fetchImplementation,
    prefix,
    signer,
    write,
  })
}

/** Deletes every object owned by one exact pull request Preview namespace. */
export const deletePreviewAudio = async (
  {accessKeyId, accountId, bucket, prefix, secretAccessKey},
  {fetchImplementation = fetch, signerFactory = createSigner, write = console.log} = {},
) => {
  const normalizedAccountId = requireValue(accountId, 'CLOUDFLARE_R2_ACCOUNT_ID')
  const normalizedBucket = requireValue(bucket, 'POMO_PAID_AUDIO_R2_BUCKET')
  const normalizedPrefix = requireValue(prefix, 'POMO_PAID_AUDIO_R2_PREFIX')

  if (!PREVIEW_PREFIX_PATTERN.test(normalizedPrefix)) {
    throw new TypeError('POMO_PAID_AUDIO_R2_PREFIX must identify one PR Preview.')
  }

  const signer = signerFactory({
    accessKeyId: requireValue(accessKeyId, 'POMO_PAID_AUDIO_R2_ACCESS_KEY_ID'),
    secretAccessKey: requireValue(secretAccessKey, 'POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY'),
  })
  const bucketUrl = new URL(
    `/${normalizedBucket}/`,
    `https://${normalizedAccountId}.r2.cloudflarestorage.com`,
  )
  return deletePreviewBatches({
    bucketUrl,
    fetchImplementation,
    prefix: normalizedPrefix,
    signer,
    write,
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deletePreviewAudio({
    accessKeyId: process.env.POMO_PAID_AUDIO_R2_ACCESS_KEY_ID,
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    bucket: process.env.POMO_PAID_AUDIO_R2_BUCKET,
    prefix: process.env.POMO_PAID_AUDIO_R2_PREFIX,
    secretAccessKey: process.env.POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Unknown R2 Preview cleanup failure.')
    process.exitCode = 1
  })
}
