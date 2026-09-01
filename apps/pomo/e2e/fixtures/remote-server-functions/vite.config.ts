import {fileURLToPath} from 'node:url'
import {solidStart} from '@solidjs/start/config'
import {nitro} from 'nitro/vite'
import {defineConfig} from 'vite'

import {staticNitroEntryPlugin} from '../../../scripts/vite/static-nitro-entry/plugin'
import {createRemoteServerFunctionsPlugin} from '../../../vite/remote-server-functions'

const SSR_ORIGIN = 'http://127.0.0.1:45173'
type BuildTarget = 'ssg' | 'ssr'

const resolveBuildTarget = (): BuildTarget => {
  const value = process.env.POMO_E2E_BUILD_TARGET

  if (value === 'ssg' || value === 'ssr') {
    return value
  }

  throw new TypeError('POMO_E2E_BUILD_TARGET must be ssg or ssr.')
}

export default defineConfig(() => {
  const buildTarget = resolveBuildTarget()
  const isStaticBuild = buildTarget === 'ssg'
  const buildDirectory = fileURLToPath(new URL(`.nitro/${buildTarget}`, import.meta.url))
  const outputDirectory = fileURLToPath(new URL(`.output/${buildTarget}`, import.meta.url))

  return {
    nitro: {
      buildDir: buildDirectory,
      output: {dir: outputDirectory},
      ...(isStaticBuild ? {prerender: {routes: ['/']}, preset: 'static'} : {}),
    },
    plugins: [
      ...(isStaticBuild ? [createRemoteServerFunctionsPlugin({publicOrigin: SSR_ORIGIN})] : []),
      solidStart({middleware: './src/middleware.ts'}),
      nitro(),
      ...(isStaticBuild ? [staticNitroEntryPlugin] : []),
    ],
  }
})
