import {z} from 'zod'
import {failure, type Failure, type Result, success} from '../shared/contracts'
import {createLspService} from './create-lsp-service'
import type {RustProject} from './rust/types'
import {resolveAnalyzer} from './rust/resolve-analyzer'
const statusSchema = z.object({quiescent: z.boolean()})
const startService = (project: RustProject, command: string) =>
  createLspService({
    arguments: [],
    capabilities: {experimental: {serverStatusNotification: true}},
    command,
    directory: project.directory,
    failed: 'rust-analysis-failed',
    initialization: {
      cargo: {buildScripts: {enable: false}, noDeps: true, sysroot: null},
      checkOnSave: false,
      diagnostics: {enable: false},
      files: {watcher: 'server'},
      linkedProjects: [{crates: project.crates}],
      procMacro: {enable: false},
    },
    language: 'rust',
    readiness: {
      complete: (value) => {
        const result = statusSchema.safeParse(value)
        return result.success && result.data.quiescent
      },
      method: 'experimental/serverStatus',
    },
    unavailable: 'rust-analyzer-unavailable',
  })

/** Creates a Rust service that provisions its analyzer on first lookup and owns its process. */
export const createRustService = (project: RustProject): ReturnType<typeof createLspService> => {
  type Service = ReturnType<typeof createLspService>
  let service: Service | undefined
  let pending: Promise<Result<Service>> | undefined
  let disposed = false
  const stopped = Promise.withResolvers<Failure>()
  const prepare = (): Promise<Result<Service>> => {
    if (pending === undefined) {
      pending = resolveAnalyzer()
        .then((command) => {
          if (disposed) {
            return failure('rust-analysis-failed')
          }
          service = startService(project, command)
          return success(service)
        })
        .catch(() => {
          pending = undefined
          return failure('rust-analyzer-unavailable')
        })
    }
    return pending
  }
  return {
    dispose: () => {
      disposed = true
      stopped.resolve(failure('rust-analysis-failed'))
      service?.dispose()
    },
    lookupSymbols: async (path, source, offset, lookup) => {
      if (disposed) {
        return failure('rust-analysis-failed')
      }
      const prepared = await Promise.race([prepare(), stopped.promise])
      return prepared.ok ? prepared.value.lookupSymbols(path, source, offset, lookup) : prepared
    },
    update: (root, changes) => service?.update(root, changes),
  }
}
