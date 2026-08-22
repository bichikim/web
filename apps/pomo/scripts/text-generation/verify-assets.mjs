import {readFile} from 'node:fs/promises'

const HTTP_PARTIAL_CONTENT_STATUS = 206
const manifestUrl = new URL('./assets.json', import.meta.url)
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))
const revisionPrefix = `models/text-generation/${manifest.repositoryId}/${manifest.revision}`
const assets = [
  ...manifest.revisionObjects.map((asset) => ({
    bytes: asset.bytes,
    key: `${revisionPrefix}/${asset.path}`,
  })),
  ...manifest.aliases,
]

const verifyAsset = async (asset) => {
  const url = new URL(asset.key, manifest.publicBaseUrl)

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {Range: 'bytes=0-0'},
    })
    const contentRange = response.headers.get('content-range')
    const rangeMatch = /^bytes 0-0\/(?<bytes>\d+)$/u.exec(contentRange ?? '')
    await response.body?.cancel()

    if (
      response.status !== HTTP_PARTIAL_CONTENT_STATUS ||
      Number(rangeMatch?.groups?.bytes) !== asset.bytes
    ) {
      const receivedRange = contentRange ?? 'no content-range'
      return {
        key: asset.key,
        message: `expected 206 and ${asset.bytes} bytes, received ${response.status} and ${receivedRange}`,
      }
    }

    return null
  } catch (error) {
    return {key: asset.key, message: error instanceof Error ? error.message : String(error)}
  }
}

const failures = (await Promise.all(assets.map(verifyAsset))).filter((failure) => failure !== null)

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.key}: ${failure.message}`)
  }
  process.exitCode = 1
} else {
  console.info(`Verified ${assets.length} ${manifest.bucket} objects.`)
}
