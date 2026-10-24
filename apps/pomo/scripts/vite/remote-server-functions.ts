import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import type {Plugin} from 'vite'

interface PackageMetadata {
  readonly version?: unknown
}

interface RemoteServerFunctionsOptions {
  readonly publicOrigin: string
}

const SUPPORTED_SOLID_START_VERSION = '2.0.0-rc.9'
const CLIENT_RUNTIME_SUFFIX = '/@solidjs/start/dist/fns/client.js'
const CLIENT_BASE_URL_SOURCE = 'let baseURL = import.meta.env.BASE_URL ?? "/";'
const require = createRequire(import.meta.url)

const getSolidStartVersion = (): string | undefined => {
  const runtimePath = require.resolve('@solidjs/start/fns/client')
  const packagePath = join(dirname(runtimePath), '..', '..', 'package.json')
  const metadata: unknown = JSON.parse(readFileSync(packagePath, 'utf8'))

  if (typeof metadata !== 'object' || metadata === null) {
    return undefined
  }

  const {version} = metadata as PackageMetadata

  return typeof version === 'string' ? version : undefined
}

export const transformRemoteServerFunctions = (code: string, publicOrigin: string): string => {
  const occurrenceCount = code.split(CLIENT_BASE_URL_SOURCE).length - 1

  if (occurrenceCount !== 1) {
    throw new Error(
      `Expected one SolidStart server-function base URL declaration, found ${occurrenceCount}.`,
    )
  }

  const remoteBaseURL = new URL('/', publicOrigin).href

  return code.replace(CLIENT_BASE_URL_SOURCE, `let baseURL = ${JSON.stringify(remoteBaseURL)};`)
}

export const createRemoteServerFunctionsPlugin = ({
  publicOrigin,
}: RemoteServerFunctionsOptions): Plugin => {
  const solidStartVersion = getSolidStartVersion()

  if (solidStartVersion !== SUPPORTED_SOLID_START_VERSION) {
    const foundVersion = solidStartVersion ?? 'an unreadable version'

    throw new Error(
      `Remote server functions support @solidjs/start ${SUPPORTED_SOLID_START_VERSION}; found ${foundVersion}.`,
    )
  }

  return {
    apply: 'build',
    enforce: 'pre',
    name: 'pomo:remote-server-functions',
    transform(code, id) {
      const normalizedId = id.split('?', 1)[0]?.replaceAll('\\', '/')

      if (!normalizedId?.endsWith(CLIENT_RUNTIME_SUFFIX)) {
        return undefined
      }

      return transformRemoteServerFunctions(code, publicOrigin)
    },
  }
}
