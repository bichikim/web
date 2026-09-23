import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {resolveOptions} from './config'
import {NaturalLintCore} from './core'
import {formatProjectReport} from './diagnostics'
import {evaluateReviews, formatEvaluationReport} from './evaluate'
import {analyzeProject} from './project'
import {createDecisionProviderFactory} from './provider'
import {
  createPendingReviewCandidates,
  createReviewCandidates,
  createTrainingRecords,
  mergeReviewRecords,
  readReviewAnswers,
  readReviewRecords,
  writeReviewArtifacts,
} from './review'
import type {DecisionProviderFactory, NaturalLintOptions} from './types'

export interface CliArguments {
  readonly answersPath?: string
  readonly command: 'check' | 'evaluate' | 'review'
  readonly configPath: string
  readonly exportPath?: string
  readonly json: boolean
  readonly reviewsPath?: string
  readonly useCache: boolean
}

const valueAfter = (arguments_: ReadonlyArray<string>, flag: string): string | undefined => {
  const index = arguments_.indexOf(flag)
  if (index === -1) {
    return undefined
  }
  const value = arguments_[index + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a path.`)
  }
  return value
}

const parseArguments = (arguments_: ReadonlyArray<string>): CliArguments => {
  const [command] = arguments_
  if (command !== 'check' && command !== 'evaluate' && command !== 'review') {
    throw new Error(
      'Usage: natural-lint <check|evaluate|review> [--config path] [--json] [--no-cache] ' +
        '[--answers path] [--reviews path] [--export path]',
    )
  }
  return {
    ...(valueAfter(arguments_, '--answers') === undefined
      ? {}
      : {answersPath: valueAfter(arguments_, '--answers')}),
    command,
    configPath: valueAfter(arguments_, '--config') ?? 'natural-lint.config.mjs',
    ...(valueAfter(arguments_, '--export') === undefined
      ? {}
      : {exportPath: valueAfter(arguments_, '--export')}),
    json: arguments_.includes('--json'),
    ...(valueAfter(arguments_, '--reviews') === undefined
      ? {}
      : {reviewsPath: valueAfter(arguments_, '--reviews')}),
    useCache: !arguments_.includes('--no-cache'),
  }
}

const loadOptions = async (configPath: string): Promise<NaturalLintOptions> => {
  const absolutePath = path.resolve(configPath)
  const imported = (await import(pathToFileURL(absolutePath).href)) as {default?: unknown}
  if (imported.default === undefined || typeof imported.default !== 'object') {
    throw new Error(`Config must default-export natural lint options: ${absolutePath}`)
  }
  return imported.default as NaturalLintOptions
}

export const runEvaluationCli = async (
  argumentsValue: CliArguments,
  root: string,
): Promise<number> => {
  const reviewsPath = path.resolve(
    root,
    argumentsValue.reviewsPath ?? '.natural-lint/reviews.jsonl',
  )
  const report = evaluateReviews(await readReviewRecords(reviewsPath))
  process.stdout.write(
    `${argumentsValue.json ? JSON.stringify(report, null, 2) : formatEvaluationReport(report)}\n`,
  )
  return 0
}

export const runCliWithOptions = async (
  argumentsValue: CliArguments,
  sourceOptions: NaturalLintOptions,
  root: string,
  sourceProviderFactory?: DecisionProviderFactory,
): Promise<number> => {
  if (argumentsValue.command === 'evaluate') {
    return runEvaluationCli(argumentsValue, root)
  }
  const options = resolveOptions(sourceOptions, root, {useCache: argumentsValue.useCache})
  const providerFactory = sourceProviderFactory ?? createDecisionProviderFactory(options)
  const core = new NaturalLintCore(options, providerFactory)
  try {
    const report = await analyzeProject(core, options)
    if (argumentsValue.command === 'review') {
      const reviewsPath = path.resolve(
        root,
        argumentsValue.reviewsPath ?? '.natural-lint/reviews.jsonl',
      )
      const trainingPath = path.resolve(
        root,
        argumentsValue.exportPath ?? '.natural-lint/training.jsonl',
      )
      if (reviewsPath === trainingPath) {
        throw new TypeError('Review ledger and training export paths must be different.')
      }
      const candidates = createReviewCandidates(report, options, providerFactory)
      const existing = await readReviewRecords(reviewsPath)
      const pending = createPendingReviewCandidates(candidates, existing)
      const labels =
        argumentsValue.answersPath === undefined
          ? pending.length === 0
            ? new Map()
            : await import('./review-tui/run-review-tui').then(({runReviewTui}) =>
                runReviewTui(root, pending),
              )
          : await readReviewAnswers(path.resolve(root, argumentsValue.answersPath))
      const records = mergeReviewRecords(candidates, existing, labels)
      await writeReviewArtifacts(reviewsPath, trainingPath, records)
      const summary = {
        candidates: candidates.length,
        exported: createTrainingRecords(records).length,
        reviewed: records.length,
        reviewsPath,
        trainingPath,
      }
      process.stdout.write(
        `${JSON.stringify(summary, null, argumentsValue.json ? 2 : undefined)}\n`,
      )
      return 0
    }
    process.stdout.write(
      `${argumentsValue.json ? JSON.stringify(report, null, 2) : formatProjectReport(report)}\n`,
    )
    return report.diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 1 : 0
  } finally {
    await core.close()
  }
}

export const runCli = async (arguments_: ReadonlyArray<string>): Promise<number> => {
  const argumentsValue = parseArguments(arguments_)
  if (argumentsValue.command === 'evaluate') {
    return runEvaluationCli(argumentsValue, process.cwd())
  }
  return runCliWithOptions(
    argumentsValue,
    await loadOptions(argumentsValue.configPath),
    process.cwd(),
  )
}

const executablePath = process.argv.at(1)
if (
  executablePath !== undefined &&
  path.resolve(executablePath) === path.resolve(fileURLToPath(import.meta.url))
) {
  runCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    },
  )
}
