import type ts from '@typescript/typescript6'

export const DIAGNOSTIC_MODES = ['off', 'warn', 'error'] as const
export const SERVE_DIAGNOSTIC_MODES = ['off', 'warn'] as const

export type DiagnosticMode = (typeof DIAGNOSTIC_MODES)[number]
export type LayaBackend = 'auto' | 'coreml' | 'onnx'
export type ModelProvider = 'jev' | 'laya'
export type CoremlRuntime = 'external' | 'managed'
export type ServeDiagnosticMode = (typeof SERVE_DIAGNOSTIC_MODES)[number]
export type DiagnosticSeverity = 'error' | 'warn'
export type ExpectedRuleStatus = 'fail' | 'pass' | 'uncertain'
export type RuleSeverity = DiagnosticSeverity | 'experiment'
export type RuleStatus = 'fail' | 'pass' | 'skip' | 'uncertain'
export type BuiltinRuleId = '@natural-lint/unexpected-error-becomes-success-like-result'

export type DecisionValue =
  | ReadonlyArray<DecisionValue>
  | DecisionObject
  | boolean
  | null
  | number
  | string

export interface DecisionObject {
  readonly [key: string]: DecisionValue
}

export interface NoulDecisionQuestion {
  readonly criteria?: {
    readonly false?: string
    readonly true?: string
  }
  readonly instruction: string
  readonly type: 'noul'
}

export interface ChoiceDecisionQuestion {
  readonly criteria: ReadonlyArray<string> | Readonly<Record<string, string | null>>
  readonly instruction: string
  readonly type: 'choice'
}

export type DecisionQuestion = ChoiceDecisionQuestion | NoulDecisionQuestion
export type DecisionQuestions = Readonly<Record<string, DecisionQuestion>>

export interface NoulDecisionAnswer {
  readonly probability: number
  readonly type: 'noul'
}

export interface ChoiceDecisionAnswer {
  readonly choice: string
  readonly confidence: number
  readonly probabilities: Readonly<Record<string, number>>
  readonly type: 'choice'
}

export type DecisionAnswer = ChoiceDecisionAnswer | NoulDecisionAnswer
export type DecisionAnswers = Readonly<Record<string, DecisionAnswer>>

export interface FileNameContext {
  readonly extension: string
  readonly stem: string
  readonly words: ReadonlyArray<string>
}

export interface FileOutline {
  readonly declarations: ReadonlyArray<string>
  readonly exports: ReadonlyArray<string>
  readonly imports: ReadonlyArray<string>
}

export interface FileContext {
  readonly absolutePath: string
  readonly fileName: FileNameContext
  readonly outline: FileOutline
  readonly relativePath: string
  readonly sourceFile: ts.SourceFile
  readonly sourceText: string
}

export interface NaturalLintRule {
  readonly cacheKey?: string
  readonly expected?: (context: FileContext) => ExpectedRuleStatus
  readonly id: string
  readonly inspect: (context: FileContext) => RuleInspection
  readonly message: string
  readonly questions: DecisionQuestions
  readonly reduce: (reduction: RuleReduction) => RuleDecision
  readonly select?: (context: FileContext) => boolean
  readonly severity?: RuleSeverity
}

export interface BuiltinRuleOverride {
  readonly cacheKey?: string
  readonly expected?: (context: FileContext) => ExpectedRuleStatus
  readonly message?: string
  readonly select?: (context: FileContext) => boolean
  readonly severity?: RuleSeverity
}

export interface UnexpectedErrorBecomesSuccessLikeResultOptions {
  readonly primaryOperationPrefixes?: ReadonlyArray<string>
}

export interface UnexpectedErrorBecomesSuccessLikeResultOverride extends BuiltinRuleOverride {
  readonly options?: UnexpectedErrorBecomesSuccessLikeResultOptions
}

export type BuiltinRuleEntry =
  | BuiltinRuleId
  | readonly [BuiltinRuleId, UnexpectedErrorBecomesSuccessLikeResultOverride]

export type NaturalLintRuleInput = BuiltinRuleEntry | NaturalLintRule

export interface RuleDecision {
  readonly probability: number
  readonly reason?: string
  readonly status: Exclude<RuleStatus, 'skip'>
}

export interface RuleInspectionDecision {
  readonly reason?: string
  readonly status: 'fail' | 'pass'
}

export interface RuleUnknownInspection {
  readonly reason?: string
  readonly state: DecisionValue
  readonly status: 'unknown'
}

export interface RuleInspectionGroup {
  readonly inspections: ReadonlyArray<RuleInspectionDecision | RuleUnknownInspection>
  readonly status: 'group'
}

export type RuleInspection = RuleInspectionDecision | RuleUnknownInspection | RuleInspectionGroup

export interface RuleReduction {
  readonly answers: DecisionAnswers
  readonly reason?: string
  readonly state: DecisionValue
}

export interface LayaOptions {
  readonly backend?: LayaBackend
  readonly bridgePath?: string
  readonly computeUnits?: 'all' | 'cpu' | 'cpu_gpu' | 'cpu_ne'
  readonly coreml?: CoremlLayaOptions
  readonly instances?: number
  readonly model?: string
  readonly modelRevision?: string
  readonly onnx?: OnnxLayaOptions
  readonly pythonPath?: string
}

export interface JevOptions {
  readonly concurrency?: number
  readonly model?: string
}

export interface CoremlLayaOptions {
  readonly runtime?: CoremlRuntime
  readonly runtimeDir?: string
}

export interface OnnxLayaOptions {
  readonly cacheDir?: string
  readonly modelDir?: string
  readonly modelRevision?: string
  readonly repo?: string
  readonly subfolder?: string
}

export interface NaturalLintOptions {
  readonly buildMode?: DiagnosticMode
  readonly cacheDir?: string
  readonly exclude?: ReadonlyArray<string>
  readonly include?: ReadonlyArray<string>
  readonly jev?: JevOptions
  readonly laya?: LayaOptions
  readonly provider?: ModelProvider
  readonly rules?: ReadonlyArray<NaturalLintRuleInput>
  readonly serveMode?: ServeDiagnosticMode
  readonly targets?: ReadonlyArray<NaturalLintTarget>
}

export interface NaturalLintTarget {
  readonly include: ReadonlyArray<string>
  readonly rules: ReadonlyArray<NaturalLintRuleInput>
}

export interface ResolvedCoremlLayaOptions {
  readonly bridgePath: string
  readonly computeUnits: 'all' | 'cpu' | 'cpu_gpu' | 'cpu_ne' | undefined
  readonly coreml: ResolvedCoremlRuntimeOptions
  readonly model: string
  readonly modelRevision: string
  readonly pythonPath: string
}

export interface ResolvedCoremlRuntimeOptions {
  readonly runtime: CoremlRuntime
  readonly runtimeDir: string
}

export interface ResolvedLayaOptions extends ResolvedCoremlLayaOptions {
  readonly backend: LayaBackend
  readonly instances: number
  readonly onnx: ResolvedOnnxLayaOptions
}

export interface ResolvedJevOptions {
  readonly concurrency: number
  readonly model: string
}

export interface ResolvedOnnxLayaOptions {
  readonly cacheDir: string | undefined
  readonly modelDir: string | undefined
  readonly modelRevision: string
  readonly repo: string
  readonly subfolder: string
}

export interface ResolvedNaturalLintRule extends NaturalLintRule {
  readonly matchesFile: (filePath: string) => boolean
  readonly severity: RuleSeverity
  readonly select: (context: FileContext) => boolean
  readonly useCache: boolean
}

export interface ResolvedNaturalLintOptions {
  readonly buildMode: DiagnosticMode
  readonly cacheDir: string
  readonly exclude: ReadonlyArray<string>
  readonly include: ReadonlyArray<string>
  readonly jev: ResolvedJevOptions
  readonly laya: ResolvedLayaOptions
  readonly provider: ModelProvider
  readonly root: string
  readonly rules: ReadonlyArray<ResolvedNaturalLintRule>
  readonly serveMode: ServeDiagnosticMode
  readonly useCache: boolean
}

export interface DecisionRequest {
  readonly questions: DecisionQuestions
  readonly ruleId: string
  readonly state: DecisionValue
}

export interface DecisionProvider {
  close(): Promise<void>
  decide(request: DecisionRequest): Promise<DecisionAnswers>
}

export interface DecisionProviderFactory {
  readonly identifier: string
  readonly revision: string
  create(): Promise<DecisionProvider>
}

export interface SkippedRuleOutcome {
  readonly ruleId: string
  readonly status: 'skip'
}

export interface DecidedRuleOutcome {
  readonly answers?: DecisionAnswers
  readonly cases?: ReadonlyArray<DecidedRuleOutcome>
  readonly expectedStatus?: ExpectedRuleStatus
  readonly probability: number
  readonly reason?: string
  readonly ruleId: string
  readonly state?: DecisionValue
  readonly status: Exclude<RuleStatus, 'skip'>
}

export type RuleOutcome = DecidedRuleOutcome | SkippedRuleOutcome

export interface NaturalLintDiagnostic {
  readonly filePath: string
  readonly message: string
  readonly probability: number
  readonly relativePath: string
  readonly ruleId: string
  readonly severity: DiagnosticSeverity
}

export interface ExperimentObservation {
  readonly answers?: DecisionAnswers
  readonly cases?: ReadonlyArray<ExperimentObservation>
  readonly expectedStatus?: ExpectedRuleStatus
  readonly matchesExpected?: boolean
  readonly probability: number
  readonly reason?: string
  readonly relativePath: string
  readonly state?: DecisionValue
  readonly status: Exclude<RuleStatus, 'skip'>
}

export interface RuleExperimentReport {
  readonly accuracy: number | undefined
  readonly abstainedExpectedFailures: number
  readonly abstainedExpectedPasses: number
  readonly decisiveRate: number | undefined
  readonly failed: number
  readonly falseNegatives: number
  readonly falsePositives: number
  readonly observations: ReadonlyArray<ExperimentObservation>
  readonly passed: number
  readonly precision: number | undefined
  readonly recall: number | undefined
  readonly ruleId: string
  readonly selected: number
  readonly skipped: number
  readonly uncertain: number
}

export interface FileAnalysisReport {
  readonly cacheHits: number
  readonly diagnostics: ReadonlyArray<NaturalLintDiagnostic>
  readonly filePath: string
  readonly modelCalls: number
  readonly outcomes: ReadonlyArray<RuleOutcome>
}

export interface ProjectAnalysisReport {
  readonly cacheHits: number
  readonly diagnostics: ReadonlyArray<NaturalLintDiagnostic>
  readonly experiments: ReadonlyArray<RuleExperimentReport>
  readonly filesScanned: number
  readonly modelCalls: number
  readonly outcomes: ReadonlyArray<RuleOutcome>
}
