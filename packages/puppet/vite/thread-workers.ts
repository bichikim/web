import {globSync, readFileSync} from 'node:fs'
import {basename, posix} from 'node:path'
import {fileURLToPath} from 'node:url'
import {normalizePath, type Plugin} from 'vite'

/** Copy these assets beside Puppet's prebuilt Workers, preserving their filenames. */
export const PUPPET_THREAD_WORKERS = normalizePath(
  fileURLToPath(new URL('../dist/assets/{workerHelpers-*,puppet-worker-*}.js', import.meta.url)),
)

/** Emits the prebuilt Worker dependencies beside the client build's Worker entries. */
export const puppetThreadWorkers = (): Plugin => ({
  apply: 'build',
  applyToEnvironment: (environment) => environment.name === 'client',
  generateBundle() {
    const workers = globSync(PUPPET_THREAD_WORKERS)
    if (workers.length === 0) {
      this.error('Build @winter-love/puppet before bundling its Worker dependencies.')
    }
    const directory = this.environment.config.build.assetsDir
    for (const worker of workers) {
      this.emitFile({
        fileName: posix.join(directory, basename(worker)),
        source: readFileSync(worker),
        type: 'asset',
      })
    }
  },
  name: 'puppet-thread-workers',
})
