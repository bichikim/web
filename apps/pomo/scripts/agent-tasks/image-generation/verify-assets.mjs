import {readFile} from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('./assets.json', import.meta.url), 'utf8'))
const objects = [
  ...manifest.models.flatMap((model) =>
    model.objects.map((asset) => ({
      bytes: asset.bytes,
      key: `models/image-generation/${model.repositoryId}/${model.revision}/${asset.path}`,
    })),
  ),
  ...manifest.runtimeObjects,
]
const PARTIAL_CONTENT = 206
const origins = ['http://localhost:3100', 'https://www.pomofi.io']
const verify = async (asset, origin) => {
  const response = await fetch(new URL(asset.key, manifest.publicBaseUrl), {
    headers: {'Accept-Encoding': 'identity', Origin: origin, Range: 'bytes=0-0'},
  })
  const range = response.headers.get('content-range')
  const allowOrigin = response.headers.get('access-control-allow-origin')
  const exposed = response.headers.get('access-control-expose-headers')?.toLowerCase() ?? ''
  const body = await response.arrayBuffer()
  if (
    response.status !== PARTIAL_CONTENT ||
    range !== `bytes 0-0/${asset.bytes}` ||
    body.byteLength !== 1 ||
    (allowOrigin !== '*' && allowOrigin !== origin) ||
    !exposed.includes('content-range')
  ) {
    return {allowOrigin, exposed, key: asset.key, origin, range, status: response.status}
  }
  return null
}
const results = await Promise.all(
  objects.flatMap((asset) => origins.map((origin) => verify(asset, origin))),
)
const failures = results.filter((result) => result !== null)
if (failures.length > 0) {
  console.error(failures)
  process.exitCode = 1
} else {
  console.info(`Verified ${objects.length} R2 objects: byte lengths, Range and browser CORS.`)
}
