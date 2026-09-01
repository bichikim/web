import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {loadEnv} from 'vite'

import {resolvePublicOrigin} from '../../../vite/public-origin.ts'

export const createDesktopBuildConfig = ({configuration, publicOrigin}) => {
  const connectSource = configuration?.app?.security?.csp?.['connect-src']

  if (typeof connectSource !== 'string') {
    throw new TypeError('The Tauri connect-src policy must be a string.')
  }

  const origin = resolvePublicOrigin({POMO_PUBLIC_ORIGIN: publicOrigin})
  const sources = connectSource.split(/\s+/u).filter(Boolean)
  const mergedSources = sources.includes(origin) ? sources : [...sources, origin]

  return {
    app: {
      security: {
        csp: {
          'connect-src': mergedSources.join(' '),
        },
      },
    },
  }
}

export const createDesktopBuildArguments = ({buildArguments, configuration, publicOrigin}) => [
  'exec',
  'tauri',
  'build',
  '--config',
  JSON.stringify(createDesktopBuildConfig({configuration, publicOrigin})),
  ...buildArguments,
]

const run = () => {
  const environmentDirectory = fileURLToPath(new URL('../../../', import.meta.url))
  const configPath = fileURLToPath(new URL('../../../src-tauri/tauri.conf.json', import.meta.url))
  const configuration = JSON.parse(readFileSync(configPath, 'utf8'))
  const environment = loadEnv('production', environmentDirectory, 'POMO_')
  const buildArguments = createDesktopBuildArguments({
    buildArguments: process.argv.slice(2),
    configuration,
    publicOrigin: environment.POMO_PUBLIC_ORIGIN,
  })

  execFileSync('pnpm', buildArguments, {env: process.env, stdio: 'inherit'})
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  run()
}
