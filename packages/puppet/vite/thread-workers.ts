import {globSync, readFileSync} from 'node:fs'
import {basename, posix} from 'node:path'
import {fileURLToPath} from 'node:url'
import {normalizePath, type Plugin} from 'vite'

/** Copy these assets beside Puppet's prebuilt Rust Worker, preserving their filenames. */
export const PUPPET_THREAD_WORKERS = normalizePath(
  fileURLToPath(new URL('../dist/assets/workerHelpers-*.js', import.meta.url)),
)

/** Emits the prebuilt Rust thread entries beside the client build's numerical Worker. */
export const puppetThreadWorkers = (): Plugin => ({
  apply: 'build',
  applyToEnvironment: (environment) => environment.name === 'client',
  generateBundle() {
    const workers = globSync(PUPPET_THREAD_WORKERS)
    if (workers.length === 0) {
      this.error('Build @winter-love/puppet before bundling its Rust thread Workers.')
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
