import {createHash, randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {z} from 'zod'
import type {CommandRequest} from '../backend/command-schemas'
import type {CommandResponse, CommandSuccess} from '../backend/command-types'
import {resolveWorkspacePath} from '../backend/node/resolve-workspace-path'
import {writeDocumentPath} from '../backend/node/write-document-path'
import type {RecipeReport} from './recipe-types'

export interface RecipeOptions {
  readonly workspace: string
  readonly path: string
  /** Restore only checkpoints and artifacts whose recorded hashes still match. */
  readonly resume?: boolean
  readonly execute: (request: CommandRequest) => Promise<CommandResponse>
}

const readOptionalSource = (path: URL) =>
  readFile(path).catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return Buffer.alloc(0)
    }
    throw error
  })

export const hashRecipeEngine = async () => {
  const packaged = process.env.POFFO_RUNTIME_ROOT
  if (packaged !== undefined) {
    const sources = await Promise.all([
      readFile(new URL(import.meta.url)),
      readFile(new URL('../index.html', import.meta.url)),
    ])
    const hash = createHash('sha256')
    for (const source of sources) {
      hash.update(source)
    }
    return hash.digest('hex')
  }
  const paths = [
    import.meta.url,
    import.meta.resolve('@winter-love/puppet/player'),
    import.meta.resolve('@winter-love/puppet/model'),
    import.meta.resolve('@winter-love/puppet/converter'),
  ]
  const sources = await Promise.all(paths.map((path) => readFile(new URL(path))))
  // Include both dev renderer source and the production GUI's content-hashed entry references when present.
  const renderSources = await Promise.all([
    readOptionalSource(new URL('../../src/backend/browser/render-document.ts', import.meta.url)),
    readOptionalSource(new URL('../index.html', import.meta.url)),
  ])
  const hash = createHash('sha256')
  for (const source of [...sources, ...renderSources]) {
    hash.update(source)
  }
  return hash.digest('hex')
}

export const createRecipeContext = (options: RecipeOptions) => {
  const execute = async (operation: string, input?: unknown): Promise<CommandSuccess> => {
    const result = await options.execute({input, operation, requestId: randomUUID()})
    if (!result.ok) {
      throw new Error(`${result.error.code}: ${result.error.message}`)
    }
    return result
  }
  const artifact = async (path: string) => ({
    hash: createHash('sha256')
      .update(await readFile(await resolveWorkspacePath(options.workspace, path, 'read')))
      .digest('hex'),
    path,
  })
  const verifyArtifact = async (expected: {readonly path: string; readonly hash: string}) => {
    const actual = await artifact(expected.path)
    if (actual.hash !== expected.hash) {
      throw new Error(`artifact-mismatch: ${expected.path}`)
    }
  }
  const checkpoint = async (path: string, revision: number) => {
    const saved = await execute('document.save', {
      expectedRevision: revision,
      format: 'poffo',
      overwrite: true,
      path,
    })
    if (saved.revision !== revision) {
      throw new Error('stale-revision: model changed while checkpoint was being saved')
    }
    return artifact(path)
  }
  const writeReport = async (path: string, report: RecipeReport) => {
    await writeDocumentPath({
      content: new Blob([JSON.stringify(report, null, 2)]),
      overwrite: true,
      path: await resolveWorkspacePath(options.workspace, path, 'write'),
    })
  }
  const previewSchema = z.object({expectedRevision: z.number(), fingerprint: z.string()})
  return {artifact, checkpoint, execute, previewSchema, verifyArtifact, writeReport}
}
export type RecipeContext = ReturnType<typeof createRecipeContext>
