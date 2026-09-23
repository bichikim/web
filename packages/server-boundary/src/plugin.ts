import {resolve} from 'node:path'
import {normalizePath, type Plugin} from 'vite'

const stripQueryAndHash = (id: string): string => id.split(/[?#]/u)[0]
const BOUNDARY_ID = '\0server-directory-boundary'

export interface CreateServerBoundaryPluginOptions {
  /** Directories resolved against the Vite root; absolute paths are accepted. An empty list disables checks. */
  readonly directories: ReadonlyArray<string>
}

/** Rejects modules under the configured directories in client environments. */
export const createServerBoundaryPlugin = (options: CreateServerBoundaryPluginOptions): Plugin => {
  let directories: ReadonlyArray<string> = []

  return {
    configResolved(config) {
      directories = options.directories.map(
        (directory) => `${normalizePath(resolve(config.root, directory)).replace(/\/$/u, '')}/`,
      )
    },
    enforce: 'pre',
    name: 'server-directory-boundary',
    resolveId(id, importer) {
      if (id === BOUNDARY_ID) {
        this.error(`Server directory module reached the client: ${importer}`)
      }
    },
    transform(code, id) {
      if (this.environment.config.consumer !== 'client' || id.startsWith('\0')) {
        return
      }

      const filename = normalizePath(stripQueryAndHash(id))
      if (directories.some((directory) => filename.startsWith(directory))) {
        // SolidStart removes unused imports when compiling server functions into client references.
        return {code: `${code}\nimport ${JSON.stringify(BOUNDARY_ID)};`, map: null}
      }
    },
  }
}
