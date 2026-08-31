import {readFile, stat} from 'node:fs/promises'
import path from 'node:path'
import {glob} from 'tinyglobby'
import {CachedEmbeddingProvider, createLocalE5Provider} from './embedding'
import {extractKeys} from './extractor'
import {createDiagnostic} from './similarity'
import type {
  AnalysisReport,
  EmbeddingProvider,
  ExtractionResult,
  KeyEntry,
  ResolvedKeySimilarityOptions,
  SimilarityDiagnostic,
} from './types'

const now = (): number => performance.now()

const entryIdentifier = (entry: KeyEntry): string => `${entry.filePath}\0${entry.literalStart}`

const pairIdentifier = (diagnostic: SimilarityDiagnostic): string =>
  [entryIdentifier(diagnostic.left), entryIdentifier(diagnostic.right)].sort().join('\0')

const compareDiagnostics = (left: SimilarityDiagnostic, right: SimilarityDiagnostic): number =>
  left.left.filePath.localeCompare(right.left.filePath) ||
  left.left.literalStart - right.left.literalStart ||
  left.right.filePath.localeCompare(right.right.filePath) ||
  left.right.literalStart - right.right.literalStart

const getBestDiagnostic = (
  left: KeyEntry,
  right: KeyEntry,
  vectorsByText: ReadonlyMap<string, Float32Array>,
): SimilarityDiagnostic | undefined => {
  let best: SimilarityDiagnostic | undefined
  for (const leftComparison of left.comparisons) {
    for (const rightComparison of right.comparisons) {
      const diagnostic = createDiagnostic({
        left,
        leftComparison,
        leftVector: vectorsByText.get(leftComparison.normalizedText)!,
        right,
        rightComparison,
        rightVector: vectorsByText.get(rightComparison.normalizedText)!,
      })
      if (
        diagnostic.semanticScore >= diagnostic.semanticThreshold &&
        (best === undefined || diagnostic.semanticScore > best.semanticScore)
      ) {
        best = diagnostic
      }
    }
  }
  return best
}

export class KeySimilarityCore {
  private readonly diagnostics = new Map<string, SimilarityDiagnostic>()
  private embeddingMilliseconds = 0
  private readonly files = new Map<string, ExtractionResult>()
  private provider: EmbeddingProvider | undefined
  private reportValue: AnalysisReport = {
    diagnostics: [],
    dynamicCalls: [],
    filesScanned: 0,
    timing: {
      embeddingMilliseconds: 0,
      modelLoadMilliseconds: 0,
      searchMilliseconds: 0,
      totalMilliseconds: 0,
    },
    uniqueKeys: 0,
  }
  private searchMilliseconds = 0

  constructor(private readonly options: ResolvedKeySimilarityOptions) {}

  get report(): AnalysisReport {
    return this.reportValue
  }

  get filePaths(): ReadonlyArray<string> {
    return [...this.files.keys()].sort()
  }

  async initialize(): Promise<AnalysisReport> {
    const startedAt = now()
    this.resetAnalysisTiming()
    const modelLoadMilliseconds = await this.initializeProvider()
    const filePaths = await glob(this.options.scanInclude, {
      absolute: true,
      cwd: this.options.root,
      ignore: this.options.exclude,
      onlyFiles: true,
    })
    const sortedPaths = filePaths.map((filePath) => path.resolve(filePath)).sort()
    const contents = await Promise.all(sortedPaths.map((filePath) => readFile(filePath, 'utf8')))
    this.files.clear()
    sortedPaths.forEach((filePath, index) => {
      this.files.set(filePath, this.extractModule(contents[index]!, filePath))
    })
    const diagnostics = await this.findMatches(this.getEntries(), [], true)
    this.diagnostics.clear()
    for (const diagnostic of diagnostics) {
      this.diagnostics.set(pairIdentifier(diagnostic), diagnostic)
    }
    this.reportValue = this.createReport({
      modelLoadMilliseconds,
      startedAt,
    })
    return this.reportValue
  }

  async initializeForVite(): Promise<AnalysisReport> {
    const startedAt = now()
    this.resetAnalysisTiming()
    this.files.clear()
    this.diagnostics.clear()
    const modelLoadMilliseconds = await this.initializeProvider()
    this.reportValue = this.createReport({
      modelLoadMilliseconds,
      startedAt,
    })
    return this.reportValue
  }

  async updateFile(filePath: string, code: string | undefined): Promise<AnalysisReport> {
    const startedAt = now()
    this.resetAnalysisTiming()
    const resolvedPath = path.resolve(filePath)
    if (code === undefined) {
      this.removeModule(resolvedPath)
    } else {
      const extraction = this.extractModule(code, resolvedPath)
      const diagnostics = await this.updateExtraction(resolvedPath, extraction)
      this.replaceFileDiagnostics(resolvedPath, diagnostics)
    }
    this.reportValue = this.createReport({
      modelLoadMilliseconds: 0,
      startedAt,
    })
    return this.reportValue
  }

  extractModule(code: string, filePath: string): ExtractionResult {
    return extractKeys(code, path.resolve(filePath), this.options.keyDetector, {
      semanticThreshold: this.options.semanticThreshold,
    })
  }

  async updateExtraction(
    filePath: string,
    extraction: ExtractionResult,
  ): Promise<ReadonlyArray<SimilarityDiagnostic>> {
    const resolvedPath = path.resolve(filePath)
    const existingEntries = [...this.files.entries()]
      .filter(([existingPath]) => existingPath !== resolvedPath)
      .flatMap(([, existingExtraction]) => existingExtraction.entries)
    this.files.set(resolvedPath, extraction)
    return this.findMatches(extraction.entries, existingEntries, true)
  }

  removeModule(filePath: string): void {
    const resolvedPath = path.resolve(filePath)
    this.files.delete(resolvedPath)
    this.replaceFileDiagnostics(resolvedPath, [])
  }

  private replaceFileDiagnostics(
    filePath: string,
    diagnostics: ReadonlyArray<SimilarityDiagnostic>,
  ): void {
    for (const [identifier, diagnostic] of this.diagnostics) {
      if (diagnostic.left.filePath === filePath || diagnostic.right.filePath === filePath) {
        this.diagnostics.delete(identifier)
      }
    }
    for (const diagnostic of diagnostics) {
      this.diagnostics.set(pairIdentifier(diagnostic), diagnostic)
    }
  }

  private createReport(timing: {
    readonly modelLoadMilliseconds: number
    readonly startedAt: number
  }): AnalysisReport {
    const entries = this.getEntries()
    return {
      diagnostics: [...this.diagnostics.values()].sort(compareDiagnostics),
      dynamicCalls: [...this.files.values()].flatMap((extraction) => extraction.dynamicCalls),
      filesScanned: this.files.size,
      timing: {
        embeddingMilliseconds: this.embeddingMilliseconds,
        modelLoadMilliseconds: timing.modelLoadMilliseconds,
        searchMilliseconds: this.searchMilliseconds,
        totalMilliseconds: now() - timing.startedAt,
      },
      uniqueKeys: new Set(
        entries.map(
          (entry) =>
            `${entry.group ?? ''}\0${entry.comparisons
              .map((comparison) => comparison.normalizedText)
              .sort()
              .join('\0')}`,
        ),
      ).size,
    }
  }

  private getEntries(): ReadonlyArray<KeyEntry> {
    return [...this.files.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([, extraction]) => extraction.entries)
  }

  private async findMatches(
    leftEntries: ReadonlyArray<KeyEntry>,
    rightEntries: ReadonlyArray<KeyEntry>,
    includeLeftPairs: boolean,
  ): Promise<ReadonlyArray<SimilarityDiagnostic>> {
    if (!this.provider || leftEntries.length === 0) {
      return []
    }
    const entries = [...leftEntries, ...rightEntries]
    const texts = [
      ...new Set(
        entries.flatMap((entry) =>
          entry.comparisons.map((comparison) => comparison.normalizedText),
        ),
      ),
    ]
    const embeddingStartedAt = now()
    const vectors = await this.provider.embed(texts)
    this.embeddingMilliseconds += now() - embeddingStartedAt
    const searchStartedAt = now()
    const vectorsByText = new Map(texts.map((text, index) => [text, vectors[index]!] as const))
    const diagnostics: SimilarityDiagnostic[] = []
    leftEntries.forEach((left, leftIndex) => {
      const comparisonEntries = [
        ...rightEntries,
        ...(includeLeftPairs ? leftEntries.slice(leftIndex + 1) : []),
      ].filter((right) => right.group === left.group)
      const matches = comparisonEntries
        .map((right) => getBestDiagnostic(left, right, vectorsByText))
        .filter((diagnostic): diagnostic is SimilarityDiagnostic => diagnostic !== undefined)
      diagnostics.push(...matches)
    })
    const sortedDiagnostics = diagnostics.sort(compareDiagnostics)
    this.searchMilliseconds += now() - searchStartedAt
    return sortedDiagnostics
  }

  private async initializeProvider(): Promise<number> {
    if (this.provider !== undefined) {
      return 0
    }
    await this.validatePaths()
    const modelStartedAt = now()
    const baseProvider = await createLocalE5Provider(this.options)
    this.provider = new CachedEmbeddingProvider(baseProvider, this.options.cacheDir)
    return now() - modelStartedAt
  }

  private resetAnalysisTiming(): void {
    this.embeddingMilliseconds = 0
    this.searchMilliseconds = 0
  }

  private async validatePaths(): Promise<void> {
    const required = [this.options.modelPath, this.options.wasmPath].filter(
      (filePath): filePath is string => filePath !== undefined,
    )
    await Promise.all(
      required.map(async (filePath) => {
        try {
          await stat(filePath)
        } catch (cause: unknown) {
          throw new Error(`Required local path does not exist: ${filePath}`, {cause})
        }
      }),
    )
  }
}
