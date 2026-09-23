import path from 'node:path'
import {z} from 'zod'
import {BUILTIN_RULE_PREFIX, resolveBuiltinRule} from './builtin-rules/index'
import {
  type BuiltinRuleEntry,
  type DecisionQuestion,
  DIAGNOSTIC_MODES,
  type NaturalLintOptions,
  type NaturalLintRule,
  type NaturalLintRuleInput,
  type ResolvedNaturalLintOptions,
  type ResolvedNaturalLintRule,
  type RuleSeverity,
  SERVE_DIAGNOSTIC_MODES,
} from './types'

export const DEFAULT_MODEL = 'aac6fef/laya-multilingual-coreml'
export const DEFAULT_MODEL_REVISION = '8139e9089273319512c730218903784074133187'
export const DEFAULT_ONNX_MODEL_REVISION = '68f27dfe5a27a54fb2b1fefc432f43f972e90868'
const selectEveryFile = (): boolean => true

const optionsSchema = z
  .object({
    buildMode: z.enum(DIAGNOSTIC_MODES).default('error'),
    cacheDir: z.string().min(1).default('node_modules/.cache/natural-lint/v1'),
    exclude: z
      .array(z.string().min(1))
      .default(['**/*.spec.*', '**/*.test.*', '**/generated/**', '**/node_modules/**']),
    include: z.array(z.string().min(1)).min(1).default(['src/**/*.{ts,tsx,js,jsx,mts,mjs}']),
    laya: z
      .object({
        backend: z.enum(['auto', 'coreml', 'onnx']).default('auto'),
        bridgePath: z.string().min(1).optional(),
        computeUnits: z.enum(['all', 'cpu', 'cpu_gpu', 'cpu_ne']).optional(),
        coreml: z
          .object({
            runtime: z.enum(['external', 'managed']).default('managed'),
            runtimeDir: z.string().min(1).default('node_modules/.cache/natural-lint/coreml'),
          })
          .strict()
          .prefault({}),
        model: z.string().min(1).optional(),
        modelRevision: z.string().min(1).optional(),
        onnx: z
          .object({
            cacheDir: z.string().min(1).optional(),
            modelDir: z.string().min(1).optional(),
            modelRevision: z.string().min(1).optional(),
            repo: z.string().min(1).optional(),
            subfolder: z.string().min(1).optional(),
          })
          .strict()
          .default({}),
        pythonPath: z.string().min(1).optional(),
      })
      .strict()
      .prefault({}),
    rules: z.unknown(),
    serveMode: z.enum(SERVE_DIAGNOSTIC_MODES).default('warn'),
  })
  .strict()

const validateRuleFunctions = (rule: NaturalLintRule, severity: RuleSeverity): void => {
  if (rule.select !== undefined && typeof rule.select !== 'function') {
    throw new TypeError(`Natural lint rule ${rule.id} select must be a function.`)
  }
  if (rule.expected !== undefined && typeof rule.expected !== 'function') {
    throw new TypeError(`Natural lint rule ${rule.id} expected must be a function.`)
  }
  if (rule.expected !== undefined && severity !== 'experiment') {
    throw new TypeError(
      `Natural lint rule ${rule.id} expected is only available when severity is experiment.`,
    )
  }
  if (typeof rule.inspect !== 'function') {
    throw new TypeError(`Natural lint rule ${rule.id} inspect must be a function.`)
  }
  if (typeof rule.reduce !== 'function') {
    throw new TypeError(`Natural lint rule ${rule.id} reduce must be a function.`)
  }
}

const validateQuestion = (ruleId: string, identifier: string, question: DecisionQuestion): void => {
  if (identifier.trim().length === 0) {
    throw new TypeError(`Natural lint rule ${ruleId} question id must not be empty.`)
  }
  if (question.instruction.trim().length === 0) {
    throw new TypeError(`Natural lint rule ${ruleId} question ${identifier} must not be empty.`)
  }
  if (question.type === 'choice') {
    const options = Array.isArray(question.criteria)
      ? question.criteria
      : Object.keys(question.criteria)
    if (options.length < 2 || options.some((option) => option.trim().length === 0)) {
      throw new TypeError(
        `Natural lint rule ${ruleId} choice question ${identifier} requires two named options.`,
      )
    }
  }
}

const normalizeRule = (input: NaturalLintRuleInput): NaturalLintRule => {
  if (typeof input === 'string' || Array.isArray(input)) {
    return resolveBuiltinRule(input as BuiltinRuleEntry)
  }
  const rule = input as NaturalLintRule
  if (rule.id.startsWith(BUILTIN_RULE_PREFIX)) {
    throw new TypeError(`${BUILTIN_RULE_PREFIX} is reserved for built-in rules.`)
  }
  return rule
}

const resolveRule = (input: NaturalLintRuleInput): ResolvedNaturalLintRule => {
  const rule = normalizeRule(input)
  if (rule.id.trim().length === 0) {
    throw new TypeError('Natural lint rule id must not be empty.')
  }
  const severity = rule.severity ?? 'error'
  validateRuleFunctions(rule, severity)
  if (rule.cacheKey !== undefined && rule.cacheKey.trim().length === 0) {
    throw new TypeError(`Natural lint rule ${rule.id} cacheKey must not be empty.`)
  }
  if (rule.message.trim().length === 0) {
    throw new TypeError(`Natural lint rule ${rule.id} message must not be empty.`)
  }
  const questions = Object.entries(rule.questions)
  if (questions.length === 0) {
    throw new TypeError(`Natural lint rule ${rule.id} requires at least one question.`)
  }
  for (const [identifier, question] of questions) {
    validateQuestion(rule.id, identifier, question)
  }
  return {
    ...rule,
    select: rule.select ?? selectEveryFile,
    severity,
    useCache: severity !== 'experiment',
  }
}

export const resolveOptions = (
  options: NaturalLintOptions,
  root: string,
  runtime: {readonly useCache?: boolean} = {},
): ResolvedNaturalLintOptions => {
  if (!Array.isArray(options.rules) || options.rules.length === 0) {
    throw new TypeError('Natural lint requires at least one rule.')
  }
  const parsed = optionsSchema.parse(options)
  if (parsed.laya.onnx.modelDir !== undefined && parsed.laya.onnx.modelRevision === undefined) {
    throw new TypeError('laya.onnx.modelRevision is required when modelDir is configured.')
  }
  const rules = options.rules.map(resolveRule)
  const identifiers = new Set(rules.map((rule) => rule.id))
  if (identifiers.size !== rules.length) {
    throw new TypeError('Natural lint rule ids must be unique.')
  }
  return {
    buildMode: parsed.buildMode,
    cacheDir: path.resolve(root, parsed.cacheDir),
    exclude: parsed.exclude,
    include: parsed.include,
    laya: {
      backend: parsed.laya.backend,
      bridgePath: path.resolve(
        parsed.laya.bridgePath ?? path.resolve(import.meta.dirname, '../bridge/laya_bridge.py'),
      ),
      computeUnits: parsed.laya.computeUnits,
      coreml: {
        runtime: parsed.laya.coreml.runtime,
        runtimeDir: path.resolve(root, parsed.laya.coreml.runtimeDir),
      },
      model: parsed.laya.model ?? DEFAULT_MODEL,
      modelRevision: parsed.laya.modelRevision ?? DEFAULT_MODEL_REVISION,
      onnx: {
        cacheDir:
          parsed.laya.onnx.cacheDir === undefined
            ? undefined
            : path.resolve(root, parsed.laya.onnx.cacheDir),
        modelDir:
          parsed.laya.onnx.modelDir === undefined
            ? undefined
            : path.resolve(root, parsed.laya.onnx.modelDir),
        modelRevision: parsed.laya.onnx.modelRevision ?? DEFAULT_ONNX_MODEL_REVISION,
        repo: parsed.laya.onnx.repo ?? 'receptron/laya-onnx',
        subfolder: parsed.laya.onnx.subfolder ?? 'multilingual',
      },
      pythonPath: parsed.laya.pythonPath ?? 'python3',
    },
    root: path.resolve(root),
    rules,
    serveMode: parsed.serveMode,
    useCache: runtime.useCache ?? true,
  }
}
