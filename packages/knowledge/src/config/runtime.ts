import {readFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {parse} from 'yaml'
import {z} from 'zod'

import {type KnowledgeConfig, parseKnowledgeConfig, type ParseKnowledgeConfigFailure} from './parse'

export interface KnowledgeSettings {
  readonly repository: KnowledgeConfig
  readonly qdrantUrl: string
  readonly ollamaUrl: string
  readonly collection: string
  readonly apiKey?: string
}

export interface LoadKnowledgeSettingsOptions {
  readonly root: string
  readonly env: Readonly<Record<string, string | undefined>>
}

export interface InvalidRuntimeConfigError {
  readonly code: 'invalid-runtime-config'
  readonly detail: string
}

export type LoadKnowledgeSettingsResult =
  | {readonly ok: true; readonly value: KnowledgeSettings}
  | {readonly ok: false; readonly error: InvalidRuntimeConfigError}
  | ParseKnowledgeConfigFailure

const machineSchema = z
  .object({
    apiKey: z.string().optional(),
    collection: z.string().optional(),
    ollamaUrl: z.string().optional(),
    qdrantUrl: z.string().optional(),
  })
  .strict()
const DEFAULT_REPOSITORY =
  'version: 1\nembedding:\n  model: bge-m3\ninclude: ["**/*.md", "**/*.txt"]\n'
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])

const optionalFile = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

const validateEndpoint = (value: string, allowRemote: boolean): void => {
  const url = new URL(value)
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    (!LOCAL_HOSTS.has(url.hostname) && !allowRemote)
  ) {
    throw new Error('Invalid endpoint')
  }
}

/** Loads repository config and machine settings; environment values override global config. */
export const loadKnowledgeSettings = async (
  options: LoadKnowledgeSettingsOptions,
): Promise<LoadKnowledgeSettingsResult> => {
  try {
    const repository = parseKnowledgeConfig(
      (await optionalFile(join(options.root, '.knowledge.yml'))) ?? DEFAULT_REPOSITORY,
    )
    if (!repository.ok) {
      return repository
    }
    const directory = options.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
    const global = await optionalFile(join(directory, 'knowledge', 'config.yml'))
    const machine = machineSchema.parse(global === undefined ? {} : parse(global))
    const qdrantUrl =
      options.env.KNOWLEDGE_QDRANT_URL ?? machine.qdrantUrl ?? 'http://127.0.0.1:6333'
    const ollamaUrl =
      options.env.KNOWLEDGE_OLLAMA_URL ?? machine.ollamaUrl ?? 'http://127.0.0.1:11434'
    const collection = options.env.KNOWLEDGE_COLLECTION ?? machine.collection ?? 'knowledge-v1'
    const apiKey = options.env.KNOWLEDGE_QDRANT_API_KEY ?? machine.apiKey
    const allowRemote = options.env.KNOWLEDGE_ALLOW_REMOTE === 'true'
    validateEndpoint(qdrantUrl, allowRemote)
    validateEndpoint(ollamaUrl, allowRemote)
    if (!/^[a-z\d_-]+$/iu.test(collection)) {
      throw new Error('Invalid collection')
    }
    return {
      ok: true,
      value: {apiKey, collection, ollamaUrl, qdrantUrl, repository: repository.value},
    }
  } catch {
    // Machine configuration can contain credentials; do not serialize its parser errors.
    return {
      error: {
        code: 'invalid-runtime-config',
        detail:
          'Check global config and KNOWLEDGE_* variables. Endpoints must be local unless KNOWLEDGE_ALLOW_REMOTE=true.',
      },
      ok: false,
    }
  }
}
