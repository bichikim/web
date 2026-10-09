import {z} from 'zod'
import {createLspService} from './create-lsp-service'
import type {RustProject} from './rust/types'
import {resolveAnalyzer} from './rust/resolve-analyzer'
const statusSchema = z.object({quiescent: z.boolean()})
export const createRustService = (project: RustProject) =>
  createLspService({
    arguments: [],
    capabilities: {experimental: {serverStatusNotification: true}},
    command: resolveAnalyzer(),
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
