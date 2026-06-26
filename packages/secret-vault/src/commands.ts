import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_CONFIG_NAME,
  loadConfig,
  resolveConfigPath,
  resolveExportPath,
  writeConfig,
} from './config'
import {SecretVaultError} from './errors'
import {commitAndPush, createGitHubRepository, syncRepository, warnIfPublicRepository} from './git'
import {formatDotenv, parseAssignment, parseDotenv, parseKey} from './key-value'
import {resolveNamespace} from './namespace'
import {writeSecretFile} from './secret-file'
import {getVaultFilePath, readVaultValues, writeVaultValues} from './vault'
import type {CommandRunner, Prompt, SecretVaultConfig, StorageMode, VaultValues} from './types'

interface CommandOptions {
  readonly configPath?: string
  readonly cwd: string
  readonly namespace?: string
  readonly prompt: Prompt
  readonly readStdin?: () => Promise<string>
  readonly repoPath?: string
  readonly runner: CommandRunner
}

interface InitOptions extends CommandOptions {
  readonly createRepoName?: string
  readonly namespace?: string
  readonly repository?: string
  readonly storage?: StorageMode
}

interface ExportOptions extends CommandOptions {
  readonly out?: string
}

interface SecretInputOptions extends CommandOptions {
  readonly stdin?: boolean
  readonly value?: string
}

interface ImportOptions extends CommandOptions {
  readonly confirmOverwrite?: boolean
  readonly stdin?: boolean
}

interface SyncOptions extends CommandOptions {
  readonly out?: string
}

export interface SyncResult {
  readonly exportPath: string
  readonly keyCount: number
  readonly skipped: false
}

export interface SyncSkippedResult {
  readonly skipped: true
}

const loadCommandContext = async (options: CommandOptions) => {
  const config = await loadConfig({
    configPath: options.configPath,
    cwd: options.cwd,
  })
  const namespace = await resolveNamespace({
    cliNamespace: options.namespace,
    configNamespace: config.namespace,
    cwd: options.cwd,
    runner: options.runner,
  })

  await warnIfPublicRepository(options.runner, config.repository)

  const repoPath = await syncRepository(
    {runner: options.runner},
    config.repository,
    options.repoPath,
  )
  const vaultPath = getVaultFilePath(repoPath, namespace)

  return {
    config,
    namespace,
    repoPath,
    vaultPath,
  }
}

const loadValues = async (
  vaultPath: string,
  storage: StorageMode,
  prompt: Prompt,
): Promise<readonly [VaultValues, string | undefined]> => {
  if (storage === 'plain') {
    return [await readVaultValues(vaultPath, undefined), undefined]
  }

  const passphrase = await prompt.passphrase()

  return [await readVaultValues(vaultPath, passphrase), passphrase]
}

const readCommandStdin = async (options: CommandOptions) => {
  if (options.readStdin === undefined) {
    throw new SecretVaultError('stdin reader is not available')
  }

  return options.readStdin()
}

const resolveSecretInput = async (input: string, options: SecretInputOptions) => {
  const hasValueOption = options.value !== undefined
  const hasStdinOption = options.stdin === true

  if (hasValueOption && hasStdinOption) {
    throw new SecretVaultError('Use only one value source')
  }

  if (input.includes('=') && (hasValueOption || hasStdinOption)) {
    throw new SecretVaultError('Use KEY=VALUE or KEY with --value/--stdin, not both')
  }

  if (hasValueOption) {
    return {
      key: parseKey(input),
      value: options.value as string,
    }
  }

  if (hasStdinOption) {
    return {
      key: parseKey(input),
      value: await readCommandStdin(options),
    }
  }

  if (input.includes('=')) {
    return parseAssignment(input)
  }

  const key = parseKey(input)

  return {
    key,
    value: await options.prompt.value(key),
  }
}

const saveValues = async (
  context: Awaited<ReturnType<typeof loadCommandContext>>,
  values: VaultValues,
  passphrase: string | undefined,
  options: CommandOptions,
) => {
  await writeVaultValues(context.vaultPath, context.config.storage, values, passphrase)
  await commitAndPush(
    {prompt: options.prompt, runner: options.runner},
    context.repoPath,
    context.namespace,
    context.vaultPath,
  )
}

const writeDotenvExport = async (exportPath: string, values: VaultValues) => {
  await writeSecretFile(exportPath, `${formatDotenv(values)}\n`)
}

export const initVault = async (options: InitOptions) => {
  const configPath = resolveConfigPath({
    configPath: options.configPath,
    cwd: options.cwd,
  })

  if (fs.existsSync(configPath)) {
    throw new SecretVaultError(`${path.basename(configPath)} already exists`)
  }

  const repository =
    options.repository ??
    (options.createRepoName === undefined
      ? undefined
      : await createGitHubRepository(options.runner, options.createRepoName))

  if (repository === undefined) {
    throw new SecretVaultError('Repository is required. Use --repository or --create-repo.')
  }

  // config 에 필요한 값은 리턴하고 config 는 이함수 호출된후 다른 곳에서 만들어 져야 함
  const config: SecretVaultConfig =
    options.namespace === undefined
      ? {
          repository,
          storage: options.storage ?? 'encrypted',
        }
      : {
          namespace: options.namespace,
          repository,
          storage: options.storage ?? 'encrypted',
        }

  // todo config 파일 생성 부분을 분리해야 함
  await writeConfig(configPath, config)
}

export const createRepo = async (name: string, options: CommandOptions) => {
  // 추후 옵션으로 gitlab 등 다른 저장소 생성 기능 추가 필요
  const repository = await createGitHubRepository(options.runner, name)

  // config 파일 생성 부분을 분리해야 함 이 함수의 역할은 지금은 구현되어 있지 않지만 gitlab 등 다른 저장소 생성시 구분하여 호출하는 통합 함수임

  // todo config 파일 생성 부분을 분리해야 함
  const configPath = resolveConfigPath({
    configPath: options.configPath,
    cwd: options.cwd,
  })

  // todo config 파일 생성 부분을 분리해야 함
  const config: SecretVaultConfig = {
    repository,
    storage: 'encrypted',
  }

  // todo repo 만드는 부분과 config 파일 생성 부분을 분리해야 함
  await writeConfig(configPath, config)

  return repository
}

export const addSecret = async (input: string, options: SecretInputOptions) => {
  const {key, value} = await resolveSecretInput(input, options)
  const context = await loadCommandContext(options)
  const [values, passphrase] = await loadValues(
    context.vaultPath,
    context.config.storage,
    options.prompt,
  )

  if (values[key] !== undefined) {
    const shouldOverwrite = await options.prompt.confirm(`${key} already exists. Overwrite?`)

    if (!shouldOverwrite) {
      return false
    }
  }

  values[key] = value

  await saveValues(context, values, passphrase, options)

  return true
}

export const modifySecret = async (input: string, options: SecretInputOptions) => {
  const {key, value} = await resolveSecretInput(input, options)
  const context = await loadCommandContext(options)
  const [values, passphrase] = await loadValues(
    context.vaultPath,
    context.config.storage,
    options.prompt,
  )

  if (values[key] === undefined) {
    const shouldCreate = await options.prompt.confirm(`${key} does not exist. Create it?`)

    if (!shouldCreate) {
      return false
    }
  }

  values[key] = value

  await saveValues(context, values, passphrase, options)

  return true
}

export const importSecrets = async (source: string | undefined, options: ImportOptions) => {
  if (source !== undefined && options.stdin === true) {
    throw new SecretVaultError('Use a file path or --stdin, not both')
  }

  if (source === undefined && options.stdin !== true) {
    throw new SecretVaultError('Import source is required. Pass a file path or --stdin.')
  }

  const content =
    options.stdin === true
      ? await readCommandStdin(options)
      : await fs.promises.readFile(path.resolve(options.cwd, source as string), 'utf8')
  const imported = parseDotenv(content)
  const context = await loadCommandContext(options)
  const [values, passphrase] = await loadValues(
    context.vaultPath,
    context.config.storage,
    options.prompt,
  )

  const conflicts = Object.keys(imported)
    .filter((key) => values[key] !== undefined)
    .sort()

  if (conflicts.length > 0) {
    if (options.confirmOverwrite !== true) {
      throw new SecretVaultError(
        [
          `Import would overwrite existing keys: ${conflicts.join(', ')}.`,
          'Pass --confirm-overwrite to prompt before overwriting.',
        ].join(' '),
      )
    }

    const shouldOverwrite = await options.prompt.confirm(
      `Overwrite ${conflicts.length} existing key${conflicts.length === 1 ? '' : 's'}: ${conflicts.join(', ')}?`,
    )

    if (!shouldOverwrite) {
      return []
    }
  }

  Object.assign(values, imported)

  await saveValues(context, values, passphrase, options)

  return Object.keys(imported).sort()
}

export const listSecrets = async (options: CommandOptions) => {
  const context = await loadCommandContext(options)
  const [values] = await loadValues(context.vaultPath, context.config.storage, options.prompt)

  return Object.keys(values).sort()
}

export const exportSecrets = async (options: ExportOptions) => {
  const context = await loadCommandContext(options)
  const [values] = await loadValues(context.vaultPath, context.config.storage, options.prompt)
  const content = formatDotenv(values)

  if (options.out !== undefined) {
    await writeDotenvExport(path.resolve(options.cwd, options.out), values)
  }

  return content
}

export const syncSecrets = async (
  options: SyncOptions,
): Promise<SyncResult | SyncSkippedResult> => {
  const configPath = resolveConfigPath({
    configPath: options.configPath,
    cwd: options.cwd,
  })

  if (!fs.existsSync(configPath)) {
    return {skipped: true}
  }

  const context = await loadCommandContext(options)
  const [values] = await loadValues(context.vaultPath, context.config.storage, options.prompt)
  const exportPath = resolveExportPath({
    cwd: options.cwd,
    exportPath: context.config.exportPath,
    out: options.out,
  })

  await writeSecretFile(exportPath, `${formatDotenv(values)}\n`)

  return {
    exportPath,
    keyCount: Object.keys(values).length,
    skipped: false,
  }
}

export const getDefaultConfigName = () => DEFAULT_CONFIG_NAME
