export const DIAGNOSTIC_MODES = ['off', 'warn', 'error'] as const
export const SERVE_DIAGNOSTIC_MODES = ['off', 'warn'] as const
export const DEFAULT_SEMANTIC_THRESHOLD = 0.9

export type DiagnosticMode = (typeof DIAGNOSTIC_MODES)[number]
export type ServeDiagnosticMode = (typeof SERVE_DIAGNOSTIC_MODES)[number]

export interface KeyCallArgument {
  readonly kind: 'dynamic' | 'string' | 'template'
  readonly value: string | undefined
}

export interface KeyDetectionContext {
  readonly arguments: ReadonlyArray<KeyCallArgument>
  readonly filePath: string
  readonly imported: string
  readonly localName: string
  readonly position: SourcePosition
  readonly source: string
}

export interface GroupedKeyDetection {
  readonly argumentIndex: number
  readonly group: string
}

export type KeyDetection = GroupedKeyDetection | number | undefined

export type KeyDetector = (context: KeyDetectionContext) => KeyDetection

export type SimilarityThresholdResolver = (key: string) => number

export type SimilarityThreshold = SimilarityThresholdResolver | number

export interface SourcePosition {
  readonly column: number
  readonly line: number
}

export interface KeyComparison {
  readonly normalizedText: string
  readonly originalText: string
  readonly semanticThreshold: number
}

export interface KeyEntry {
  readonly comparisons: ReadonlyArray<KeyComparison>
  readonly filePath: string
  readonly group: string | undefined
  readonly imported: string
  readonly literalEnd: number
  readonly literalKind: 'double' | 'single' | 'template'
  readonly literalStart: number
  readonly originalText: string
  readonly position: SourcePosition
  readonly source: string
}

export interface DynamicKeyCall {
  readonly filePath: string
  readonly position: SourcePosition
}

export interface ExtractionResult {
  readonly dynamicCalls: ReadonlyArray<DynamicKeyCall>
  readonly entries: ReadonlyArray<KeyEntry>
}

export interface SimilarityDiagnostic {
  readonly left: KeyEntry
  readonly leftComparison: KeyComparison
  readonly right: KeyEntry
  readonly rightComparison: KeyComparison
  readonly semanticScore: number
  readonly semanticThreshold: number
}

export interface AnalysisReport {
  readonly diagnostics: ReadonlyArray<SimilarityDiagnostic>
  readonly dynamicCalls: ReadonlyArray<DynamicKeyCall>
  readonly filesScanned: number
  readonly timing: AnalysisTiming
  readonly uniqueKeys: number
}

export interface AnalysisTiming {
  readonly embeddingMilliseconds: number
  readonly modelLoadMilliseconds: number
  readonly searchMilliseconds: number
  readonly totalMilliseconds: number
}

export interface EmbeddingProvider {
  readonly identifier: string
  readonly revision: string
  embed(texts: ReadonlyArray<string>): Promise<ReadonlyArray<Float32Array>>
}

export interface KeySimilarityOptions {
  /**
   * Internal test hook for deterministic embeddings.
   * Supplying it bypasses the Worker and runs comparison inline.
   * @internal
   */
  readonly __embeddingProvider?: EmbeddingProvider
  readonly buildMode?: DiagnosticMode
  readonly cacheDir?: string
  readonly exclude?: ReadonlyArray<string>
  /** Selects imported calls and the argument containing each key. */
  readonly keyDetector: KeyDetector
  readonly modelIdentifier?: string
  /** Overrides the q8 multilingual E5 model included with the package. */
  readonly modelPath?: string
  readonly modelRevision?: string
  /** Selects files when the CLI scans the project without a Vite module graph. */
  readonly scanInclude?: ReadonlyArray<string>
  readonly semanticThreshold?: SimilarityThreshold
  readonly serveMode?: ServeDiagnosticMode
  readonly wasmPath?: string
}

export interface ResolvedKeySimilarityOptions {
  readonly __embeddingProvider: EmbeddingProvider | undefined
  readonly buildMode: DiagnosticMode
  readonly cacheDir: string
  readonly exclude: ReadonlyArray<string>
  readonly keyDetector: KeyDetector
  readonly modelIdentifier: string
  readonly modelPath: string
  readonly modelRevision: string
  readonly root: string
  readonly scanInclude: ReadonlyArray<string>
  readonly semanticThreshold: SimilarityThreshold
  readonly serveMode: ServeDiagnosticMode
  readonly wasmPath: string | undefined
}
