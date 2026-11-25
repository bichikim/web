import {createReadStream} from 'node:fs'
import {readFile, stat} from 'node:fs/promises'
import {join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {appCacheDirectory} from './model-cache.mjs'
import {prepareModelAsset} from '@winter-love/model-cache'

const manifest = JSON.parse(
  await readFile(new URL('../conversation-model.json', import.meta.url), 'utf8'),
)
export const conversationDirectory = join(
  appCacheDirectory(),
  'conversation-models',
  manifest.revision,
)

/**
 * Serves verified shared weights on demand without placing them in Vite output or browser caches.
 * @returns {import('vite').Plugin}
 */
export const conversationAssets = () => ({
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/conversation-models/', (request, response, next) => {
      const path = new URL(request.url, 'http://localhost').pathname
      const file = manifest.files.find((entry) => path === `/${manifest.model}/${entry.path}`)
      if (file === undefined) {
        response.statusCode = 404
        response.end()
        return
      }
      const serve = async () => {
        const asset = await prepareModelAsset(
          join(conversationDirectory, manifest.model),
          file,
          `https://huggingface.co/${manifest.model}/resolve/${manifest.revision}/${file.path}`,
        )
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader(
          'Content-Type',
          file.path.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        )
        response.setHeader('Content-Length', (await stat(asset)).size)
        if (request.method === 'HEAD') {
          response.end()
        } else {
          await pipeline(createReadStream(asset), response)
        }
      }
      serve().catch((cause) => {
        if (!response.destroyed) {
          // oxlint-disable-next-line promise/no-callback-in-promise -- Connect owns middleware error responses.
          next(cause)
        }
      })
    })
  },
  name: 'wallpaper-conversation-assets',
})
