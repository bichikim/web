import {createHash} from 'node:crypto'
import path from 'node:path'
import {DecisionCache} from './cache'
import {createFileContext} from './file-context'
import type {
  DecidedRuleOutcome,
  DecisionProvider,
  DecisionProviderFactory,
  DecisionValue,
  ExpectedRuleStatus,
  FileAnalysisReport,
  NaturalLintDiagnostic,
  ResolvedNaturalLintOptions,
  ResolvedNaturalLintRule,
  RuleDecision,
  RuleInspectionDecision,
  RuleOutcome,
  RuleUnknownInspection,
} from './types'

const RULE_FORMAT_VERSION = 1
const PROBABILITY_PRECISION = 4

interface RuleEvaluation {
  readonly cacheHit: boolean
  readonly diagnostic: NaturalLintDiagnostic | undefined
  readonly modelCalls: number
  readonly outcome: RuleOutcome
}

interface RuleDecisionEvaluation {
  readonly modelCalls: number
  readonly outcome: DecidedRuleOutcome
}

const hash = (value: string): string => createHash('sha256').update(value).digest('hex')
const functionSource = (value: (...arguments_: never[]) => unknown): string =>
  Function.prototype.toString.call(value)

export const createRuleFingerprint = (rule: ResolvedNaturalLintRule): string =>
  hash(
    JSON.stringify({
      cacheKey: rule.cacheKey,
      inspect: functionSource(rule.inspect),
      message: rule.message,
      questions: rule.questions,
      reduce: functionSource(rule.reduce),
      ruleFormatVersion: RULE_FORMAT_VERSION,
      ruleId: rule.id,
      select: functionSource(rule.select),
    }),
  )

const createCacheKey = (options: {
  readonly fileHash: string
  readonly provider: DecisionProviderFactory
  readonly relativePath: string
  readonly rule: ResolvedNaturalLintRule
}): string =>
  hash(
    JSON.stringify({
      fileHash: options.fileHash,
      model: options.provider.identifier,
      modelRevision: options.provider.revision,
      relativePath: options.relativePath,
      ruleFingerprint: createRuleFingerprint(options.rule),
    }),
  )

const createDiagnostic = (
  filePath: string,
  relativePath: string,
  rule: ResolvedNaturalLintRule,
  outcome: RuleOutcome,
): NaturalLintDiagnostic | undefined => {
  if (outcome.status !== 'fail' || rule.severity === 'experiment') {
    return undefined
  }
  return {
    filePath,
    message: [
      rule.message,
      ...(outcome.reason === undefined ? [] : [`Reason: ${outcome.reason}.`]),
      `(violation probability ${outcome.probability.toFixed(PROBABILITY_PRECISION)})`,
    ].join(' '),
    probability: outcome.probability,
    relativePath,
    ruleId: rule.id,
    severity: rule.severity,
  }
}

const resolveExpectedStatus = (
  rule: ResolvedNaturalLintRule,
  context: ReturnType<typeof createFileContext>,
): ExpectedRuleStatus | undefined => {
  const expectedStatus = rule.expected?.(context)
  if (
    expectedStatus !== undefined &&
    expectedStatus !== 'fail' &&
    expectedStatus !== 'pass' &&
    expectedStatus !== 'uncertain'
  ) {
    throw new TypeError(
      `Natural lint rule ${rule.id} expected must return pass, fail, or uncertain.`,
    )
  }
  return expectedStatus
}

const validateDecisionValue = (ruleId: string, state: DecisionValue): void => {
  let serialized: string | undefined
  try {
    serialized = JSON.stringify(state)
  } catch (cause: unknown) {
    throw new TypeError(`Natural lint rule ${ruleId} state must be JSON serializable.`, {cause})
  }
  if (serialized === undefined) {
    throw new TypeError(`Natural lint rule ${ruleId} state must be JSON serializable.`)
  }
}

const createRuleOutcome = (
  rule: ResolvedNaturalLintRule,
  decision: RuleDecision,
  answers?: DecidedRuleOutcome['answers'],
  state?: DecisionValue,
): DecidedRuleOutcome => {
  if (
    !Number.isFinite(decision.probability) ||
    decision.probability < 0 ||
    decision.probability > 1
  ) {
    throw new RangeError(`Natural lint rule ${rule.id} returned an invalid probability.`)
  }
  if (!['fail', 'pass', 'uncertain'].includes(decision.status)) {
    throw new TypeError(`Natural lint rule ${rule.id} returned an invalid status.`)
  }
  return {
    ...(answers === undefined ? {} : {answers}),
    probability: decision.probability,
    ...(decision.reason === undefined ? {} : {reason: decision.reason}),
    ruleId: rule.id,
    ...(state === undefined ? {} : {state}),
    status: decision.status,
  }
}

const inspectionProbability = (status: 'fail' | 'pass'): number => {
  if (status === 'fail') {
    return 1
  }
  if (status === 'pass') {
    return 0
  }
  throw new TypeError(`Rule inspection returned an invalid status: ${String(status)}.`)
}

const evaluateInspection = async (
  getProvider: () => Promise<DecisionProvider>,
  rule: ResolvedNaturalLintRule,
  inspection: RuleInspectionDecision | RuleUnknownInspection,
): Promise<RuleDecisionEvaluation> => {
  if (inspection.status === 'fail' || inspection.status === 'pass') {
    const decision = {...inspection, probability: inspectionProbability(inspection.status)}
    return {modelCalls: 0, outcome: createRuleOutcome(rule, decision)}
  }
  if (inspection.status !== 'unknown') {
    throw new TypeError(
      `Natural lint rule ${rule.id} inspect returned an invalid status: ${String(inspection.status)}.`,
    )
  }
  const {state} = inspection
  validateDecisionValue(rule.id, state)
  const provider = await getProvider()
  const answers = await provider.decide({questions: rule.questions, ruleId: rule.id, state})
  const decision = rule.reduce({
    answers,
    ...(inspection.reason === undefined ? {} : {reason: inspection.reason}),
    state,
  })
  return {modelCalls: 1, outcome: createRuleOutcome(rule, decision, answers, state)}
}

const evaluateRuleDecision = async (
  getProvider: () => Promise<DecisionProvider>,
  rule: ResolvedNaturalLintRule,
  context: ReturnType<typeof createFileContext>,
): Promise<RuleDecisionEvaluation> => {
  const inspection = rule.inspect(context)
  if (inspection.status !== 'group') {
    return evaluateInspection(getProvider, rule, inspection)
  }
  if (inspection.inspections.length === 0) {
    throw new TypeError(`Natural lint rule ${rule.id} inspect returned an empty group.`)
  }
  const evaluations = await Promise.all(
    inspection.inspections.map((item) => evaluateInspection(getProvider, rule, item)),
  )
  const cases = evaluations.map(({outcome}) => outcome)
  const selected =
    cases.find(({status}) => status === 'fail') ??
    cases.find(({status}) => status === 'uncertain') ??
    cases[0]!
  return {
    modelCalls: evaluations.reduce((total, {modelCalls}) => total + modelCalls, 0),
    outcome: {...selected, cases},
  }
}

export class NaturalLintCore {
  private readonly cache: DecisionCache
  private providerPromise: Promise<DecisionProvider> | undefined

  constructor(
    private readonly options: ResolvedNaturalLintOptions,
    private readonly providerFactory: DecisionProviderFactory,
  ) {
    this.cache = new DecisionCache(options.cacheDir)
  }

  async analyzeFile(filePath: string, sourceText: string): Promise<FileAnalysisReport> {
    const absolutePath = path.resolve(filePath)
    const relativePath = path.relative(this.options.root, absolutePath).split(path.sep).join('/')
    const fileHash = hash(sourceText)
    let context: ReturnType<typeof createFileContext> | undefined
    const getContext = (): ReturnType<typeof createFileContext> => {
      context ??= createFileContext({filePath: absolutePath, root: this.options.root, sourceText})
      return context
    }
    const evaluations = await Promise.all(
      this.options.rules.map((rule) =>
        this.evaluateRule({absolutePath, fileHash, getContext, relativePath, rule}),
      ),
    )

    return {
      cacheHits: evaluations.filter((evaluation) => evaluation.cacheHit).length,
      diagnostics: evaluations.flatMap((evaluation) =>
        evaluation.diagnostic === undefined ? [] : [evaluation.diagnostic],
      ),
      filePath: absolutePath,
      modelCalls: evaluations.reduce((total, evaluation) => total + evaluation.modelCalls, 0),
      outcomes: evaluations.map((evaluation) => evaluation.outcome),
    }
  }

  async close(): Promise<void> {
    const {providerPromise} = this
    this.providerPromise = undefined
    if (providerPromise !== undefined) {
      await (await providerPromise).close()
    }
  }

  private async evaluateRule(options: {
    readonly absolutePath: string
    readonly fileHash: string
    readonly getContext: () => ReturnType<typeof createFileContext>
    readonly relativePath: string
    readonly rule: ResolvedNaturalLintRule
  }): Promise<RuleEvaluation> {
    if (!options.rule.matchesFile(options.absolutePath)) {
      return {
        cacheHit: false,
        diagnostic: undefined,
        modelCalls: 0,
        outcome: {ruleId: options.rule.id, status: 'skip'},
      }
    }
    const cacheKey = createCacheKey({
      fileHash: options.fileHash,
      provider: this.providerFactory,
      relativePath: options.relativePath,
      rule: options.rule,
    })
    const useCache = this.options.useCache && options.rule.useCache
    const cached = useCache ? await this.cache.read(cacheKey) : undefined
    if (cached !== undefined) {
      return {
        cacheHit: true,
        diagnostic: createDiagnostic(
          options.absolutePath,
          options.relativePath,
          options.rule,
          cached,
        ),
        modelCalls: 0,
        outcome: cached,
      }
    }

    const context = options.getContext()
    const selected = options.rule.select(context)
    const evaluation: RuleDecisionEvaluation | undefined = selected
      ? await evaluateRuleDecision(() => this.getProvider(), options.rule, context)
      : undefined
    const outcome: RuleOutcome =
      evaluation === undefined
        ? {ruleId: options.rule.id, status: 'skip'}
        : options.rule.severity === 'experiment'
          ? {
              ...evaluation.outcome,
              expectedStatus: resolveExpectedStatus(options.rule, context),
            }
          : evaluation.outcome
    if (useCache) {
      await this.cache.write(cacheKey, outcome)
    }
    return {
      cacheHit: false,
      diagnostic: createDiagnostic(
        options.absolutePath,
        options.relativePath,
        options.rule,
        outcome,
      ),
      modelCalls: evaluation?.modelCalls ?? 0,
      outcome,
    }
  }

  private getProvider(): Promise<DecisionProvider> {
    this.providerPromise ??= this.providerFactory.create()
    return this.providerPromise
  }
}
