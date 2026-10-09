import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {createLspService} from './create-lsp-service'

export const createPythonService = (directory: string) => {
  const bundled = new URL('./python/langserver.index.js', import.meta.url)
  const entrypoint = existsSync(bundled)
    ? bundled
    : import.meta.resolve('pyright/langserver.index.js')
  return createLspService({
    arguments: [fileURLToPath(entrypoint), '--stdio'],
    command: process.execPath,
    configuration: {
      pyright: {disableOrganizeImports: true},
      python: {
        analysis: {
          autoSearchPaths: true,
          diagnosticMode: 'openFilesOnly',
          logLevel: 'Error',
          typeCheckingMode: 'off',
          useLibraryCodeForTypes: true,
        },
      },
    },
    directory,
    failed: 'python-analysis-failed',
    language: 'python',
    // Pyright discovers unopened workspace files during its first analysis pass.
    unavailable: 'python-analyzer-unavailable',
    waitForReferenceDiagnostics: true,
  })
}
