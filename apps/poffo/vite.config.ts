import {readFile, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {defineConfig, type Plugin} from 'vite'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'

const vendorAssets = [
  'vision_bundle.js',
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

/** Serves the same worker dependencies in development and in the production artifact. */
const trackingAssets = (): Plugin => {
  const assets = new Map(
    vendorAssets.map((name) => [
      `/tracking/vendor/${name}`,
      fileURLToPath(import.meta.resolve(`@mediapipe/tasks-vision/${name}`)),
    ]),
  )
  return {
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = assets.get(request.url ?? '')
        if (path === undefined) {
          next()
          return
        }
        response.setHeader(
          'Content-Type',
          path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        )
        response.end(readFileSync(path))
      })
    },
    generateBundle() {
      for (const [path, source] of assets) {
        this.emitFile({fileName: path.slice(1), source: readFileSync(source), type: 'asset'})
      }
    },
    name: 'poffo-tracking-assets',
  }
}

/** Exposes the retained library fixture only while developing the service. */
const developmentExamples = (): Plugin => ({
  configureServer(server) {
    const path = fileURLToPath(
      import.meta.resolve('@winter-love/puppet/examples/development-model.json'),
    )
    server.middlewares.use((request, response, next) => {
      if (request.url !== '/examples/development-model.json') {
        next()
        return
      }
      readFile(path, (error, content) => {
        if (error !== null) {
          next(error)
          return
        }
        response.setHeader('Content-Type', 'application/json')
        response.end(content)
      })
    })
  },
  name: 'poffo-development-examples',
})

export default defineConfig({
  plugins: [UnoCSS(), solid(), trackingAssets(), developmentExamples()],
  resolve: {
    // Build one shared Puppet graph instead of initializing Pixi from separate library bundles.
    alias: [
      {
        find: /^@winter-love\/puppet\/(?<entry>player|editor)$/u,
        replacement: fileURLToPath(
          new URL('../../packages/puppet/src/$1/index.ts', import.meta.url),
        ),
      },
    ],
  },
})
