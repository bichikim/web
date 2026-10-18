import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {once} from 'node:events'
import {createServer} from 'node:https'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'

/**
 * Serves only the supplied package archive, with a fixture CA and controllable download failures.
 * @param {import('./types.js').RegistryOptions} options
 */
export const startRegistry = async ({root, manifest, bytes}) => {
  const certificate = join(root, 'certificate.pem')
  const key = join(root, 'key.pem')
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      key,
      '-out',
      certificate,
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    {stdio: 'ignore'},
  )
  const NOT_FOUND = 404
  /** @type {import('./types.js').RegistryRequest[]} */
  const requests = []
  let downloadsAvailable = true
  const server = createServer(
    {cert: await readFile(certificate), key: await readFile(key)},
    (request, response) => {
      const path = decodeURIComponent((request.url ?? '/').split('?')[0])
      requests.push({method: request.method, path})
      if (!downloadsAvailable) {
        response.writeHead(NOT_FOUND).end(JSON.stringify({error: 'simulated registry failure'}))
        return
      }
      if (path === `/${manifest.name}` || path === `/${manifest.name}/${manifest.version}`) {
        const entry = {
          ...manifest,
          dist: {
            integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
            shasum: createHash('sha1').update(bytes).digest('hex'),
            tarball: `${registry}/${manifest.name}/-/codex-code-viewer-${manifest.version}.tgz`,
          },
        }
        response.setHeader('content-type', 'application/json')
        response.end(
          JSON.stringify(
            path.endsWith(`/${manifest.version}`)
              ? entry
              : {
                  'dist-tags': {latest: manifest.version},
                  name: manifest.name,
                  versions: {[manifest.version]: entry},
                },
          ),
        )
      } else if (path === `/${manifest.name}/-/codex-code-viewer-${manifest.version}.tgz`) {
        response.setHeader('content-type', 'application/octet-stream')
        response.setHeader('content-length', bytes.length)
        response.end(bytes)
      } else {
        response.writeHead(NOT_FOUND).end(JSON.stringify({error: 'not found'}))
      }
    },
  )
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const registry = `https://127.0.0.1:${address.port}`
  return {
    certificate,
    close: async () => {
      server.closeAllConnections()
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            resolve(undefined)
          }
        })
      })
    },
    requests,
    setDownloadsAvailable: (/** @type {boolean} */ available) => {
      downloadsAvailable = available
    },
    url: registry,
  }
}
