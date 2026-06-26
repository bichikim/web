import path from 'node:path'
import {SecretVaultError} from './errors'
import type {CommandRunner} from './types'

const RESERVED_NAMES = new Set(['.', '..'])

export interface ResolveNamespaceOptions {
  readonly cliNamespace?: string
  readonly configNamespace?: string
  readonly cwd: string
  readonly runner: CommandRunner
}

export const normalizeNamespace = (namespace: string) => {
  const normalized = namespace
    .trim()
    .replace(/\.git$/u, '')
    .replace(/[^A-Za-z0-9._-]+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^-|-$/gu, '')

  if (
    normalized === '' ||
    RESERVED_NAMES.has(normalized) ||
    path.basename(normalized) !== normalized
  ) {
    throw new SecretVaultError('Namespace must be a single filesystem-safe path segment')
  }

  return normalized
}

export const resolveNamespace = async (options: ResolveNamespaceOptions) => {
  if (options.cliNamespace !== undefined && options.cliNamespace.trim() !== '') {
    return normalizeNamespace(options.cliNamespace)
  }

  if (options.configNamespace !== undefined && options.configNamespace.trim() !== '') {
    return normalizeNamespace(options.configNamespace)
  }

  const result = await options.runner('git', ['remote', 'get-url', 'origin'], {
    cwd: options.cwd,
  })

  return normalizeNamespace(result.stdout)
}
