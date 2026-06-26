import fs from 'node:fs'
import path from 'node:path'
import {SecretVaultError} from './errors'
import {parseJsonText} from './json'
import type {ResolvedConfig, SecretVaultConfig, StorageMode} from './types'

export const DEFAULT_CONFIG_NAME = '.secret-vault.json'
export const DEFAULT_EXPORT_PATH = '.env.local'

export interface LoadConfigOptions {
  readonly configPath?: string
  readonly cwd: string
}

const storageModes = new Set<StorageMode>(['encrypted', 'plain'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const resolveConfigPath = (options: LoadConfigOptions) => {
  const configPath = options.configPath ?? DEFAULT_CONFIG_NAME

  return path.isAbsolute(configPath) ? configPath : path.join(options.cwd, configPath)
}

export const parseConfig = (value: unknown): SecretVaultConfig => {
  if (!isRecord(value)) {
    throw new SecretVaultError('Config must be a JSON object')
  }

  if ('vaultPath' in value) {
    throw new SecretVaultError(
      'vaultPath is not supported; vaults are stored at <namespace>/vault.json',
    )
  }

  if (typeof value.repository !== 'string' || value.repository.trim() === '') {
    throw new SecretVaultError('Config repository must be a non-empty string')
  }

  if (value.namespace !== undefined && typeof value.namespace !== 'string') {
    throw new SecretVaultError('Config namespace must be a string')
  }

  if (value.storage !== undefined) {
    if (typeof value.storage !== 'string' || !storageModes.has(value.storage as StorageMode)) {
      throw new SecretVaultError('Config storage must be "encrypted" or "plain"')
    }
  }

  if (value.exportPath !== undefined && typeof value.exportPath !== 'string') {
    throw new SecretVaultError('Config exportPath must be a string')
  }

  return {
    exportPath: value.exportPath,
    namespace: value.namespace,
    repository: value.repository,
    storage: value.storage as StorageMode | undefined,
  }
}

export const resolveExportPath = (options: {
  readonly cwd: string
  readonly exportPath: string
  readonly out?: string
}) => path.resolve(options.cwd, options.out ?? options.exportPath)

export const loadConfig = async (options: LoadConfigOptions): Promise<ResolvedConfig> => {
  const configPath = resolveConfigPath(options)

  let content: string

  try {
    content = await fs.promises.readFile(configPath, 'utf8')
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new SecretVaultError(`Config file not found: ${configPath}`)
    }

    throw error
  }

  const parsed = parseConfig(parseJsonText(content, `Config file ${configPath}`))

  return {
    ...parsed,
    configPath,
    exportPath: parsed.exportPath ?? DEFAULT_EXPORT_PATH,
    storage: parsed.storage ?? 'encrypted',
  }
}

export const writeConfig = async (configPath: string, config: SecretVaultConfig) => {
  const content = `${JSON.stringify(config, null, 2)}\n`

  await fs.promises.writeFile(configPath, content, 'utf8')
}
