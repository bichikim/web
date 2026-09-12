import {BROWSER_TARGETS} from './browser-targets'
import babel, {defineRolldownBabelPreset} from '@rolldown/plugin-babel'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import type {Plugin} from 'vite'
import {createTransformCache} from './transform-cache'
import {version} from 'core-js/package.json'
import {fileURLToPath} from 'node:url'

export const createPolyfillsPlugin = async (): Promise<Plugin> => {
  const plugin = (await babel({
    presets: [
      defineRolldownBabelPreset({
        preset: {
          plugins: [
            [
              fileURLToPath(import.meta.resolve('babel-plugin-polyfill-corejs3')),
              {
                // Resolve shared workspace code against Pomo's installed polyfills.
                absoluteImports: fileURLToPath(new URL('../../', import.meta.url)),
                method: 'usage-global',
                version,
              },
            ],
          ],
        },
        rolldown: {
          applyToEnvironmentHook: (environment) => environment.config.consumer === 'client',
        },
      }),
    ],
    targets: BROWSER_TARGETS,
  })) as Plugin

  const {transform} = plugin
  if (typeof transform !== 'object' || transform === null) {
    throw new Error('Expected the Babel plugin to expose an object transform hook.')
  }
  const original = transform.handler
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const inputs = await Promise.all(
    ['polyfills.ts', 'browser-targets.ts', 'transform-cache.ts', '../../../../pnpm-lock.yaml'].map(
      (path) => readFile(new URL(path, import.meta.url), 'utf8'),
    ),
  )
  const cache = createTransformCache(
    join(root, 'node_modules/.cache/polyfills'),
    JSON.stringify([process.version, root, ...inputs]),
  )
  transform.handler = async function handler(code, id, options) {
    if (this.environment.mode !== 'build') {
      return original.call(this, code, id, options)
    }
    const input = JSON.stringify([
      this.environment.name,
      this.environment.config.mode,
      id,
      code,
      options,
    ])
    return cache(input, async () => {
      const result = await original.call(this, code, id, options)
      if (typeof result !== 'object' || result === null || result.code === undefined) {
        return null
      }
      return {
        code: String(result.code),
        map:
          typeof result.map === 'string'
            ? result.map
            : result.map
              ? JSON.stringify(result.map)
              : null,
      }
    })
  }
  return plugin
}
