import {existsSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {z} from 'zod'
import {createLspService} from './create-lsp-service'

interface RustProject {
  readonly directory: string
  readonly file: string
  readonly manifest: boolean
}
const statusSchema = z.object({quiescent: z.boolean()})
const analyzerBinary = (): string => {
  const configured = process.env.RUST_ANALYZER_BINARY
  if (configured !== undefined) {
    return configured
  }
  const local = join(
    homedir(),
    '.cargo',
    'bin',
    process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer',
  )
  return existsSync(local) ? local : 'rust-analyzer'
}

export const createRustService = (project: RustProject) =>
  createLspService({
    arguments: [],
    capabilities: {experimental: {serverStatusNotification: true}},
    command: analyzerBinary(),
    directory: project.directory,
    failed: 'rust-analysis-failed',
    initialization: {
      cargo: {buildScripts: {enable: false}, noDeps: true},
      checkOnSave: false,
      detachedFiles: project.manifest ? [] : [project.file],
      diagnostics: {enable: false},
      files: {watcher: 'server'},
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
