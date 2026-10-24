import {mkdir, mkdtemp, rename, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {z} from 'zod'
import {runClaude} from './run-claude'
import {prepareClaudePlugin} from './prepare-claude-plugin'
import {readClaudeRuntime} from './read-claude-runtime'

export interface InstallClaudePluginOptions {
  readonly binary: string
  readonly home: string
  readonly packageRoot: string
  readonly version: string
  readonly runtimeArchive?: string
  readonly onProgress?: (stage: string) => void
  readonly onStderr?: (output: string) => void
}
const MARKETPLACE = 'winter-love-code-viewer-npm'
const identifier = `code-viewer@${MARKETPLACE}`
const pluginsSchema = z.array(
  z.object({
    enabled: z.boolean(),
    id: z.string(),
    scope: z.string(),
  }),
)
const marketplacesSchema = z.array(z.object({name: z.string(), path: z.string().optional()}))

interface RestoreInstallationOptions extends InstallClaudePluginOptions {
  readonly root: string
  readonly backup: string
  readonly replaced: boolean
  readonly committed: boolean
  readonly registered: boolean
}
const restoreInstallation = async (options: RestoreInstallationOptions): Promise<void> => {
  const failures: unknown[] = []
  try {
    if (options.registered) {
      await runClaude({
        args: ['plugin', 'marketplace', 'remove', MARKETPLACE],
        binary: options.binary,
        home: options.home,
        onStderr: options.onStderr,
      })
    }
  } catch (error) {
    failures.push(error)
  }
  try {
    if (options.committed) {
      await rm(options.root, {force: true, recursive: true})
    }
    if (options.replaced) {
      await rename(options.backup, options.root)
    }
  } catch (error) {
    failures.push(error)
  }
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      'Could not restore part of the previous Claude installation state.',
    )
  }
}

const readState = async (options: InstallClaudePluginOptions, root: string) => {
  const run = (args: readonly string[]) => runClaude({...options, args})
  options.onProgress?.('Checking Claude CLI and installation files…')
  const version = await run(['--version'])
  const match = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/u.exec(version)?.groups
  const minimumPatch = 287
  const supported =
    match !== undefined &&
    (Number(match.major) > 2 ||
      (Number(match.major) === 2 &&
        (Number(match.minor) > 1 ||
          (Number(match.minor) === 1 && Number(match.patch) >= minimumPatch))))
  if (!supported) {
    throw new Error('Claude Code CLI 2.1.287 or later is required. Update Claude CLI.')
  }
  const archive = await readClaudeRuntime({
    archive: options.runtimeArchive,
    directory: join(options.home, 'code-viewer/downloads'),
    packageRoot: options.packageRoot,
    version: options.version,
  })
  const plugins = pluginsSchema.parse(JSON.parse(await run(['plugin', 'list', '--json'])))
  const marketplaces = marketplacesSchema.parse(
    JSON.parse(await run(['plugin', 'marketplace', 'list', '--json'])),
  )
  const marketplace = marketplaces.find(({name}) => name === MARKETPLACE)
  if (marketplace !== undefined && marketplace.path !== root) {
    throw new Error(
      `${MARKETPLACE} is registered at another location: ${marketplace.path ?? 'remote source'}. ` +
        'The existing registration was not changed.',
    )
  }
  return {archive, marketplace, plugins}
}

const prepareMarketplace = async (
  options: InstallClaudePluginOptions,
  archive: Uint8Array,
  staging: string,
) => {
  await prepareClaudePlugin({archive, root: join(staging, 'code-viewer'), version: options.version})
  await mkdir(join(staging, '.claude-plugin'))
  await writeFile(
    join(staging, '.claude-plugin/marketplace.json'),
    JSON.stringify(
      {
        description: 'Code Viewer installed from npm',
        name: MARKETPLACE,
        owner: {name: 'Winter Love'},
        plugins: [{name: 'code-viewer', source: './code-viewer'}],
      },
      null,
      2,
    ),
  )
  await runClaude({...options, args: ['plugin', 'validate', staging]})
}

/** Installs a persistent local Claude marketplace through its CLI without editing MCP settings. */
export const installClaudePlugin = async (options: InstallClaudePluginOptions): Promise<string> => {
  const run = (args: readonly string[]) => runClaude({...options, args})
  const parent = join(options.home, 'code-viewer')
  const root = join(parent, 'marketplace')
  const {archive, marketplace, plugins} = await readState(options, root)
  await mkdir(parent, {recursive: true})
  const staging = await mkdtemp(join(parent, '.install-'))
  const backup = `${staging}-previous`
  let replaced = false
  let committed = false
  let registered = false
  try {
    options.onProgress?.('Preparing Claude plugin…')
    await prepareMarketplace(options, archive, staging)
    try {
      await rename(root, backup)
      replaced = true
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error
      }
    }
    await rename(staging, root)
    committed = true
    options.onProgress?.('Registering Claude marketplace…')
    if (marketplace === undefined) {
      await run(['plugin', 'marketplace', 'add', root])
      registered = true
    } else {
      await run(['plugin', 'marketplace', 'update', MARKETPLACE])
    }
    options.onProgress?.('Installing Claude plugin…')
    const installed = plugins.find(({id, scope}) => id === identifier && scope === 'user')
    await run([
      'plugin',
      installed === undefined ? 'install' : 'update',
      identifier,
      '--scope',
      'user',
    ])
    if (installed?.enabled === false) {
      await run(['plugin', 'enable', identifier, '--scope', 'user'])
    }
  } catch (error) {
    options.onProgress?.('Restoring previous Claude installation…')
    try {
      await restoreInstallation({...options, backup, committed, registered, replaced, root})
    } catch (restoration) {
      throw new AggregateError(
        [error, restoration],
        'Claude installation and restoration of previous settings failed.',
        {cause: error},
      )
    }
    throw error
  } finally {
    await rm(staging, {force: true, recursive: true})
  }
  // Keep previous files for already-running sessions; only stop the known uploaded duplicate in new sessions.
  const legacy = plugins.find(
    ({id, scope, enabled}) =>
      id === 'code-viewer@local-desktop-app-uploads' && scope === 'user' && enabled,
  )
  if (legacy !== undefined) {
    await run(['plugin', 'disable', legacy.id, '--scope', 'user'])
  }
  return join(root, 'code-viewer/runtime/Code Viewer Attachment.app')
}
