import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type {Options as ExecaOptions} from 'execa'
import {SecretVaultError} from './errors'
import type {CommandRunner, Prompt} from './types'

export interface GitContext {
  readonly runner: CommandRunner
}

export interface CommitAndPushContext extends GitContext {
  readonly prompt: Prompt
}

type CommandAttempt =
  | {
      readonly stderr: string
      readonly stdout: string
      readonly success: true
    }
  | {
      readonly message: string
      readonly stderr: string
      readonly stdout: string
      readonly success: false
    }

const formatCommandOutput = (stdout: string, stderr: string, message: string) => {
  const lines = [stdout.trim(), stderr.trim(), message.trim()].filter((line) => line !== '')

  return lines.join('\n')
}

const isMergeInProgress = (repoPath: string) =>
  fs.existsSync(path.join(repoPath, '.git', 'MERGE_HEAD'))

const buildManualResolutionMessage = (repoPath: string, vaultRelativePath: string) =>
  [
    'Vault push cancelled due to a merge conflict.',
    `Local cache: ${repoPath}`,
    'Your vault changes are committed locally but not pushed.',
    '',
    'Resolve manually:',
    `1. cd ${repoPath}`,
    '2. git status',
    `3. Resolve conflicts in ${vaultRelativePath}`,
    `4. git add ${vaultRelativePath}`,
    '5. git commit',
    '6. git push',
  ].join('\n')

const tryRunner = async (
  runner: CommandRunner,
  file: string,
  args: readonly string[],
  options?: ExecaOptions,
): Promise<CommandAttempt> => {
  try {
    const result = await runner(file, args, options)

    return {
      stderr: result.stderr,
      stdout: result.stdout,
      success: true,
    }
  } catch (error) {
    if (error instanceof SecretVaultError) {
      return {
        message: error.message,
        stderr: '',
        stdout: '',
        success: false,
      }
    }

    if (error !== null && typeof error === 'object') {
      const commandError = error as {message?: string; stderr?: unknown; stdout?: unknown}

      return {
        message: commandError.message ?? 'Command failed',
        stderr: String(commandError.stderr ?? ''),
        stdout: String(commandError.stdout ?? ''),
        success: false,
      }
    }

    throw error
  }
}

interface PullBeforePushOptions {
  readonly context: CommitAndPushContext
  readonly localVaultContent: string
  readonly namespace: string
  readonly repoPath: string
  readonly vaultPath: string
}

const pullBeforePush = async (options: PullBeforePushOptions) => {
  const {context, localVaultContent, namespace, repoPath, vaultPath} = options
  const vaultRelativePath = `${namespace}/vault.json`
  const pullResult = await tryRunner(context.runner, 'git', ['pull', '--no-rebase'], {
    cwd: repoPath,
  })

  if (pullResult.success) {
    return
  }

  const details = formatCommandOutput(pullResult.stdout, pullResult.stderr, pullResult.message)

  if (!isMergeInProgress(repoPath)) {
    throw new SecretVaultError(`Failed to sync vault repository before push:\n${details}`)
  }

  const shouldOverwrite = await context.prompt.confirm(
    `Vault sync conflict:\n${details}\n\nOverwrite remote changes with your local vault?`,
  )

  if (!shouldOverwrite) {
    await tryRunner(context.runner, 'git', ['merge', '--abort'], {cwd: repoPath})
    throw new SecretVaultError(buildManualResolutionMessage(repoPath, vaultRelativePath))
  }

  await context.runner('git', ['checkout', '--ours', '--', vaultRelativePath], {cwd: repoPath})
  await fs.promises.writeFile(vaultPath, localVaultContent, 'utf8')
  await context.runner('git', ['add', vaultRelativePath], {cwd: repoPath})
  await context.runner('git', ['commit', '--no-edit'], {cwd: repoPath})
}

export const getRepoCachePath = (repository: string) => {
  const repoKey = repository
    .replace(/\.git$/u, '')
    .replace(/[^A-Za-z0-9._-]+/gu, '-')
    .replace(/^-|-$/gu, '')

  return path.join(os.homedir(), '.cache', 'secret-vault', repoKey)
}

export const syncRepository = async (
  context: GitContext,
  repository: string,
  repoPath: string = getRepoCachePath(repository),
) => {
  if (fs.existsSync(path.join(repoPath, '.git'))) {
    await context.runner('git', ['pull', '--ff-only'], {cwd: repoPath})

    return repoPath
  }

  await fs.promises.mkdir(path.dirname(repoPath), {recursive: true})
  await context.runner('git', ['clone', repository, repoPath])

  return repoPath
}

export const commitAndPush = async (
  context: CommitAndPushContext,
  repoPath: string,
  namespace: string,
  vaultPath: string,
) => {
  const vaultRelativePath = `${namespace}/vault.json`
  const localVaultContent = await fs.promises.readFile(vaultPath, 'utf8')

  await context.runner('git', ['add', vaultRelativePath], {cwd: repoPath})

  const diff = await context.runner('git', ['diff', '--cached', '--name-only'], {cwd: repoPath})

  if (diff.stdout.trim() === '') {
    return false
  }

  await context.runner('git', ['commit', '-m', `Update secret vault namespace ${namespace}`], {
    cwd: repoPath,
  })

  await pullBeforePush({
    context,
    localVaultContent,
    namespace,
    repoPath,
    vaultPath,
  })

  const pushResult = await tryRunner(context.runner, 'git', ['push'], {cwd: repoPath})

  if (!pushResult.success) {
    throw new SecretVaultError(
      `Failed to push vault repository:\n${formatCommandOutput(
        pushResult.stdout,
        pushResult.stderr,
        pushResult.message,
      )}`,
    )
  }

  return true
}

export const ensureGhInstalled = async (runner: CommandRunner) => {
  try {
    await runner('gh', ['--version'])
  } catch {
    throw new SecretVaultError('GitHub CLI is required. Install it from https://cli.github.com/')
  }
}

export const ensureGhAuth = async (runner: CommandRunner) => {
  try {
    await runner('gh', ['auth', 'status'])
  } catch {
    await runner('gh', ['auth', 'login'], {stdio: 'inherit'})
  }
}

export const createGitHubRepository = async (runner: CommandRunner, name: string) => {
  await ensureGhInstalled(runner)
  await ensureGhAuth(runner)
  await runner('gh', ['repo', 'create', name, '--private'])

  const view = await runner('gh', ['repo', 'view', name, '--json', 'sshUrl', '-q', '.sshUrl'])

  return view.stdout.trim()
}

export const warnIfPublicRepository = async (runner: CommandRunner, repository: string) => {
  try {
    const view = await runner('gh', [
      'repo',
      'view',
      repository,
      '--json',
      'visibility',
      '-q',
      '.visibility',
    ])

    if (view.stdout.trim().toUpperCase() === 'PUBLIC') {
      process.stderr.write('Warning: configured vault repository is public.\n')
    }
  } catch {
    process.stderr.write('Warning: unable to verify vault repository visibility.\n')
  }
}
