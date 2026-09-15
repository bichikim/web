import {loadEnv} from 'vite'

import {resolvePublicOrigin} from './public-origin'

const POMO_ENVIRONMENT_PREFIX = 'POMO_'
const CONNECT_SOURCE_ORIGINS = [
  'https://storage.pomofi.io',
  'https://huggingface.co',
  'https://us.aws.cdn.hf.co',
  'https://cdn.jsdelivr.net',
  'https://pub-0e34511083544f8aaad14d0590013528.r2.dev',
]

export interface BuildEnvironment {
  readonly connectSourceList: string
  readonly environment: Record<string, string>
  readonly publicAssetOrigin: string
  readonly publicOrigin: string
}

export interface LoadBuildEnvironmentOptions {
  readonly environmentDirectory: string
  readonly mode: string
  readonly vercelUrl: string | undefined
}

export const loadBuildEnvironment = ({
  environmentDirectory,
  mode,
  vercelUrl,
}: LoadBuildEnvironmentOptions): BuildEnvironment => {
  const environment = loadEnv(mode, environmentDirectory, POMO_ENVIRONMENT_PREFIX)
  const publicOrigin = resolvePublicOrigin(environment)
  const connectSourceList = ["'self'", publicOrigin, ...CONNECT_SOURCE_ORIGINS].join(' ')
  const publicAssetOrigin = vercelUrl ? new URL(`https://${vercelUrl}`).origin : publicOrigin

  return {connectSourceList, environment, publicAssetOrigin, publicOrigin}
}
