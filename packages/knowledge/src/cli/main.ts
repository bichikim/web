import {
  type DoctorCommand,
  type EvalCommand,
  type GetCommand,
  type InspectionEvalCommand,
  parseKnowledgeArguments,
  type ReindexCommand,
  type RepositoryCommand,
  type SearchCommand,
} from './arguments'
import {evaluateKnowledgeRepository} from './evaluation'
import {evaluateInspectionArtifact} from './inspection-evaluation'
import {inspectKnowledgeRepository, type OptionalInspection} from './inspection'
import {approveKnowledgeEvaluation, generateKnowledgeEvaluation} from './generation'

import {
  doctorKnowledgeRepository,
  getKnowledgeRepository,
  indexKnowledgeRepository,
  KnowledgeCommandFailure,
  reindexKnowledgeRepository,
  searchKnowledgeRepository,
  statusKnowledgeRepository,
} from './runtime'

const USAGE = `Usage:
  know index [repository] [--json]
  know search "query" [--repo repository] [--limit 10] [--json]
  know get "docId[#unitId]" [--repo repository] [--json]
  know status [repository] [--json]
  know doctor [repository] [--model name --limit 10 --cache-dir path] [--json]
    [--inspection-mode combined|separated|contextual|research]
  know reindex [repository] [--yes] [--json]
  know mcp [repository]
  know eval <cases.yml> [--repo repository] [--k 10] [--baseline report.json] [--json]
  know eval-inspection <labels.yml> --report doctor.json [--baseline previous.json] [--output report.json] [--json]
  know eval-generate [repository] --model name --output candidates.json [--cache-dir path] [--limit 10] [--json]
  know eval-approve <candidates.json> --ids id1,id2 --reviewer name --output golden.json [--json]

Reads .knowledge.yml at the Git root. Defaults: Ollama bge-m3, Qdrant localhost:6333.
Machine settings: KNOWLEDGE_QDRANT_URL, KNOWLEDGE_OLLAMA_URL,
KNOWLEDGE_COLLECTION, KNOWLEDGE_QDRANT_API_KEY.
`
const USAGE_EXIT = 2
const METRIC_PRECISION = 4
const DEFAULT_INSPECTION_LIMIT = 10
const runInspectionEval = async (command: InspectionEvalCommand): Promise<number> => {
  const report = await evaluateInspectionArtifact(command)
  const regressions =
    report.comparison === null ? 'not compared' : report.comparison.regressions.join(', ') || 'none'
  const heading =
    report.version === 2
      ? `REVIEWED inspection evaluation\nApproved cases=${report.summary.approvedCases} ` +
        `Excluded cases=${report.summary.excludedCases}\n`
      : `${report.provisional ? 'PROVISIONAL' : 'GOLDEN'} inspection evaluation\n`
  process.stdout.write(
    command.json
      ? `${JSON.stringify(report)}\n`
      : `${
          heading
        }Candidate selection recall=${report.summary.candidateSelectionRecall ?? 'n/a'} ` +
          `Classification accuracy=${report.summary.classificationAccuracy ?? 'n/a'}\n` +
          `Regressions: ${regressions}\n`,
  )
  return report.comparison !== null && report.comparison.regressions.length > 0 ? 1 : 0
}
const runEval = async (command: EvalCommand): Promise<number> => {
  const result = await evaluateKnowledgeRepository(command)
  process.stdout.write(
    command.json
      ? `${JSON.stringify(result)}\n`
      : `Recall@${result.cutoff}=${result.summary.recall.toFixed(METRIC_PRECISION)} ` +
          `MRR@${result.cutoff}=${result.summary.mrr.toFixed(METRIC_PRECISION)} ` +
          `(${result.cases.length} cases)\n${
            result.comparison === null
              ? 'No baseline comparison.\n'
              : `Regressions: ${result.comparison.regressions.join(', ') || 'none'}\n`
          }`,
  )
  return result.comparison !== null && result.comparison.regressions.length > 0 ? 1 : 0
}
const runIndex = async (options: RepositoryCommand): Promise<void> => {
  const result = await indexKnowledgeRepository(options.inputPath)
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else {
    process.stdout.write(
      `Indexed ${result.documents} documents / ${result.points} units\n` +
        `embedded=${result.embedded} metadata=${result.metadata} ` +
        `unchanged=${result.unchanged} deleted=${result.deleted}\n`,
    )
  }
  if (result.diagnostics.length > 0) {
    process.stderr.write(`${JSON.stringify({diagnostics: result.diagnostics})}\n`)
  }
}

const runSearch = async (options: SearchCommand): Promise<void> => {
  const result = await searchKnowledgeRepository(options)
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else if (result.hits.length === 0) {
    process.stdout.write('No results in this repository/workspace.\n')
  } else {
    for (const hit of result.hits) {
      process.stdout.write(
        `${hit.payload.title} (${hit.payload.status})\n` +
          `${hit.payload.path}:${hit.payload.startLine ?? 1}  ${hit.payload.docId}#${hit.payload.unitId}\n` +
          `${hit.payload.text}\n\n`,
      )
    }
  }
}

const runGet = async (options: GetCommand): Promise<void> => {
  const result = await getKnowledgeRepository(options)
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else {
    for (const point of result.points) {
      const {payload} = point
      process.stdout.write(
        `${payload.title} (${payload.status})\n` +
          `${payload.path}:${payload.startLine ?? 1}  ${payload.docId}#${payload.unitId}\n${payload.text}\n\n`,
      )
    }
  }
}

const runStatus = async (options: RepositoryCommand): Promise<void> => {
  const result = await statusKnowledgeRepository(options.inputPath)
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else {
    process.stdout.write(
      `${result.repoId} / ${result.workspaceId}\nCollection: ${result.collection}\n` +
        `Stored: ${result.documents} documents / ${result.units} units\n` +
        `${Object.entries(result.statuses)
          .map(([status, count]) => `${status}=${count}`)
          .join(' ')}\n`,
    )
  }
}

const printInspection = (report: OptionalInspection): void => {
  if (report.status === 'unavailable') {
    process.stdout.write(`SEMANTIC unavailable ${report.code}\n`)
    return
  }
  process.stdout.write(
    `SEMANTIC ${report.status}: pairs=${report.selectedPairs}/${report.totalPairs} ` +
      `units=${report.consideredUnits}/${report.eligibleUnits} cached=${report.cached} truncated=${report.truncated}\n`,
  )
  for (const finding of report.assessments) {
    const {assessment, left, right} = finding
    if (assessment.kind !== 'unrelated') {
      process.stdout.write(
        `CANDIDATE ${assessment.kind} confidence=${assessment.confidence} ` +
          `${left.docId}#${left.unitId} <> ${right.docId}#${right.unitId}\n`,
      )
    }
  }
  for (const error of report.errors) {
    process.stdout.write(`SEMANTIC error ${error.code}\n`)
  }
  process.stdout.write(
    `SEMANTIC retrieval: candidates=${report.retrieval.candidatePairs} ` +
      `seeds=${report.consideredUnits}/${report.retrieval.seedLimit} neighbors=${report.retrieval.neighborsPerUnit}\n`,
  )
  for (const error of report.retrieval.errors) {
    process.stdout.write(`SEMANTIC retrieval error ${error.code} point=${error.pointId}\n`)
  }
}
const runDoctor = async (options: DoctorCommand): Promise<number> => {
  const base = await doctorKnowledgeRepository(options.inputPath)
  const semantic =
    options.model === undefined
      ? undefined
      : await inspectKnowledgeRepository({
          cacheDirectory: options.cacheDirectory,
          inputPath: options.inputPath,
          inspectionMode: options.inspectionMode,
          limit: options.limit ?? DEFAULT_INSPECTION_LIMIT,
          model: options.model,
        })
  const result = semantic === undefined ? base : {...base, semantic}
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else {
    for (const check of result.checks) {
      process.stdout.write(
        `${check.status.toUpperCase()} ${check.name}` +
          `${check.code === undefined ? '' : ` ${check.code}`}` +
          `${check.counts === undefined ? '' : ` ${JSON.stringify(check.counts)}`}\n`,
      )
    }
  }
  if (!options.json && semantic !== undefined) {
    printInspection(semantic)
  }
  return result.healthy && (semantic === undefined || semantic.status === 'complete') ? 0 : 1
}

const runReindex = async (options: ReindexCommand): Promise<void> => {
  const result = await reindexKnowledgeRepository({
    ...options,
    onPlan: (plan) => {
      process.stderr.write(`${JSON.stringify({event: 'reindex-plan', ...plan})}\n`)
    },
  })
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } else if (result.executed) {
    process.stdout.write(
      `Reindexed ${result.progress.embedded} units; deleted=${result.progress.deleted}\n`,
    )
  } else {
    process.stdout.write('Preview only. Add --yes to rebuild this repository/workspace.\n')
  }
}

/** Runs the CLI and returns an exit code; stdout contains results, stderr contains diagnostics. */
export const runKnowledgeCli = async (arguments_: ReadonlyArray<string>): Promise<number> => {
  const command = parseKnowledgeArguments(arguments_)
  if (command === undefined) {
    process.stderr.write(USAGE)
    return USAGE_EXIT
  }
  try {
    switch (command.command) {
      case 'eval-generate': {
        const result = await generateKnowledgeEvaluation(command)
        process.stdout.write(
          command.json
            ? `${JSON.stringify(result)}\n`
            : `Candidates: ${result.cases}; generated=${result.generated} cached=${result.cached}\n` +
                `${result.outputPath}\n`,
        )
        return 0
      }
      case 'eval-approve': {
        const result = await approveKnowledgeEvaluation(command)
        process.stdout.write(
          command.json
            ? `${JSON.stringify(result)}\n`
            : `Approved: ${result.approved}\n${result.outputPath}\n`,
        )
        return 0
      }
      case 'eval':
        return await runEval(command)
      case 'eval-inspection':
        return await runInspectionEval(command)
      case 'mcp': {
        const {serveKnowledgeStdio} = await import('../mcp/stdio')
        return await serveKnowledgeStdio(command.inputPath)
      }
      case 'help':
        process.stdout.write(USAGE)
        break
      case 'index':
        await runIndex(command)
        break
      case 'search':
        await runSearch(command)
        break
      case 'get':
        await runGet(command)
        break
      case 'doctor':
        return await runDoctor(command)
      case 'reindex':
        await runReindex(command)
        break
      case 'status':
        await runStatus(command)
        break
      default: {
        const exhaustive: never = command
        return exhaustive
      }
    }
    return 0
  } catch (error) {
    const result =
      error instanceof KnowledgeCommandFailure
        ? error.result
        : {
            error: {
              code: 'command-failed',
              detail: error instanceof Error ? error.message : String(error),
            },
            ok: false,
          }
    const secret = process.env.KNOWLEDGE_QDRANT_API_KEY
    const serialized = JSON.stringify(result)
    process.stderr.write(`${secret ? serialized.replaceAll(secret, '[redacted]') : serialized}\n`)
    return 1
  }
}
