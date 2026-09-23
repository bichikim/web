import {parse} from 'yaml'
import {z} from 'zod'

export interface EmbeddingConfig {
  readonly model: string
  readonly provider: 'ollama'
}

export interface SearchConfig {
  readonly denseCandidates: number
  readonly sparseCandidates: number
}

export interface WorkspaceConfig {
  readonly mode: 'ref'
}

export interface KnowledgeConfig {
  readonly embedding: EmbeddingConfig
  readonly exclude: ReadonlyArray<string>
  readonly include: ReadonlyArray<string>
  readonly repoId?: string
  readonly search: SearchConfig
  readonly version: 1
  readonly workspace: WorkspaceConfig
}

export interface InvalidConfigError {
  readonly code: 'invalid-config'
  readonly issues: ReadonlyArray<string>
}

export interface ParseKnowledgeConfigFailure {
  readonly error: InvalidConfigError
  readonly ok: false
}

export interface ParseKnowledgeConfigSuccess {
  readonly ok: true
  readonly value: KnowledgeConfig
}

export type ParseKnowledgeConfigResult = ParseKnowledgeConfigFailure | ParseKnowledgeConfigSuccess

const DEFAULT_SEARCH_CANDIDATES = 40

const embeddingSchema = z
  .object({
    model: z.string().trim().min(1),
    provider: z.literal('ollama').default('ollama'),
  })
  .strict()

const searchSchema = z
  .object({
    denseCandidates: z.number().int().positive().default(DEFAULT_SEARCH_CANDIDATES),
    sparseCandidates: z.number().int().positive().default(DEFAULT_SEARCH_CANDIDATES),
  })
  .strict()
  .default({
    denseCandidates: DEFAULT_SEARCH_CANDIDATES,
    sparseCandidates: DEFAULT_SEARCH_CANDIDATES,
  })

const workspaceSchema = z
  .object({
    mode: z.literal('ref').default('ref'),
  })
  .strict()
  .default({
    mode: 'ref',
  })

const knowledgeConfigSchema = z
  .object({
    embedding: embeddingSchema,
    exclude: z.array(z.string().min(1)).default([]),
    include: z.array(z.string().min(1)).default(['**/*.md']),
    repoId: z.string().trim().min(1).optional(),
    search: searchSchema,
    version: z.literal(1),
    workspace: workspaceSchema,
  })
  .strict()

const failure = (issues: ReadonlyArray<string>): ParseKnowledgeConfigFailure => ({
  error: {
    code: 'invalid-config',
    issues,
  },
  ok: false,
})

const formatIssuePath = (path: ReadonlyArray<PropertyKey>): string =>
  path.length === 0 ? 'config' : path.map(String).join('.')

export const parseKnowledgeConfig = (source: string): ParseKnowledgeConfigResult => {
  let input: unknown

  try {
    input = parse(source)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)

    return failure([`YAML: ${message}`])
  }

  const result = knowledgeConfigSchema.safeParse(input)

  if (!result.success) {
    return failure(
      result.error.issues.map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`),
    )
  }

  return {
    ok: true,
    value: result.data,
  }
}
