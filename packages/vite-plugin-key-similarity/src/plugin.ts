import path from 'node:path'
import {createFilter, normalizePath, type Plugin, type ResolvedConfig} from 'vite'
import {resolveOptions} from './config'
import {KeySimilarityCore} from './core'
import {KeyAnalysisQueue} from './queue'
import type {
  DiagnosticMode,
  KeyEntry,
  KeySimilarityOptions,
  ResolvedKeySimilarityOptions,
  SimilarityDiagnostic,
} from './types'

interface DiagnosticGroup {
  readonly diagnostics: ReadonlyArray<SimilarityDiagnostic>
  readonly entries: ReadonlyArray<KeyEntry>
}

const SCORE_PRECISION = 4
const SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]s|[jt]sx)$/u
const excludeAll = (_filePath: string): boolean => false
const getEntryIdentifier = (entry: KeyEntry): string => `${entry.filePath}\0${entry.literalStart}`
const getPairIdentifier = (leftIdentifier: string, rightIdentifier: string): string =>
  [leftIdentifier, rightIdentifier].sort().join('\0')
const compareEntries = (left: KeyEntry, right: KeyEntry): number =>
  left.filePath.localeCompare(right.filePath) || left.literalStart - right.literalStart
const formatLocation = ({filePath, position}: SimilarityDiagnostic['left'], root: string): string =>
  `${normalizePath(path.relative(root, filePath))}:${position.line}:${position.column}`
const formatEntry = (entry: KeyEntry, root: string): string => {
  const comparisonTexts = entry.comparisons.map((comparison) => comparison.originalText)
  const comparisonSuffix =
    comparisonTexts.length === 1 && comparisonTexts[0] === entry.originalText
      ? ''
      : `  [compared as: ${comparisonTexts.join(' | ')}]`
  return `${formatLocation(entry, root)}  ${entry.originalText}${comparisonSuffix}`
}

const createDiagnosticGroups = (
  diagnostics: ReadonlyArray<SimilarityDiagnostic>,
): ReadonlyArray<DiagnosticGroup> => {
  const diagnosticsByPair = new Map<string, SimilarityDiagnostic>()
  const entriesByIdentifier = new Map<string, KeyEntry>()
  for (const diagnostic of diagnostics) {
    const leftIdentifier = getEntryIdentifier(diagnostic.left)
    const rightIdentifier = getEntryIdentifier(diagnostic.right)
    diagnosticsByPair.set(getPairIdentifier(leftIdentifier, rightIdentifier), diagnostic)
    entriesByIdentifier.set(leftIdentifier, diagnostic.left)
    entriesByIdentifier.set(rightIdentifier, diagnostic.right)
  }
  const entries = [...entriesByIdentifier.values()].sort(compareEntries)
  const remainingPairs = new Set(diagnosticsByPair.keys())
  const groups: DiagnosticGroup[] = []

  for (const diagnostic of diagnostics) {
    const leftIdentifier = getEntryIdentifier(diagnostic.left)
    const rightIdentifier = getEntryIdentifier(diagnostic.right)
    const seedIdentifier = getPairIdentifier(leftIdentifier, rightIdentifier)
    if (remainingPairs.has(seedIdentifier)) {
      const groupedIdentifiers = new Set([leftIdentifier, rightIdentifier])
      for (const candidate of entries) {
        const candidateIdentifier = getEntryIdentifier(candidate)
        const belongsToCompleteGroup =
          !groupedIdentifiers.has(candidateIdentifier) &&
          [...groupedIdentifiers].every((memberIdentifier) =>
            diagnosticsByPair.has(getPairIdentifier(candidateIdentifier, memberIdentifier)),
          )
        if (belongsToCompleteGroup) {
          groupedIdentifiers.add(candidateIdentifier)
        }
      }
      const groupedDiagnostics = diagnostics.filter(
        (candidate) =>
          groupedIdentifiers.has(getEntryIdentifier(candidate.left)) &&
          groupedIdentifiers.has(getEntryIdentifier(candidate.right)),
      )
      for (const groupedDiagnostic of groupedDiagnostics) {
        remainingPairs.delete(
          getPairIdentifier(
            getEntryIdentifier(groupedDiagnostic.left),
            getEntryIdentifier(groupedDiagnostic.right),
          ),
        )
      }
      groups.push({
        diagnostics: groupedDiagnostics,
        entries: entries.filter((entry) => groupedIdentifiers.has(getEntryIdentifier(entry))),
      })
    }
  }
  return groups
}

const formatRange = (values: ReadonlyArray<number>): string => {
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const formattedMinimum = minimum.toFixed(SCORE_PRECISION)
  return minimum === maximum
    ? formattedMinimum
    : `${formattedMinimum}–${maximum.toFixed(SCORE_PRECISION)}`
}

const formatDiagnosticGroup = (group: DiagnosticGroup, index: number, root: string): string => {
  const semanticThresholds = group.diagnostics.map((diagnostic) => diagnostic.semanticThreshold)
  const semanticScores = formatRange(
    group.diagnostics.map((diagnostic) => diagnostic.semanticScore),
  )
  const scores = [
    `group=${group.entries[0]?.group ?? 'ungrouped'}`,
    `semantic=${semanticScores}/${formatRange(semanticThresholds)}`,
  ].join(', ')
  return [
    `Group ${index + 1} (${group.entries.length} keys):`,
    ...group.entries.map((entry) => formatEntry(entry, root)),
    scores,
  ].join('\n')
}

const reportDiagnostics = (
  plugin: {error(message: string): never; warn(message: string): void},
  diagnostics: ReadonlyArray<SimilarityDiagnostic>,
  mode: DiagnosticMode,
  root: string,
): void => {
  if (mode === 'off') {
    return
  }
  const messages = createDiagnosticGroups(diagnostics).map((group, index) =>
    formatDiagnosticGroup(group, index, root),
  )
  if (messages.length === 0) {
    return
  }
  const message = `Similar key groups:\n${messages.join('\n\n')}`
  if (mode === 'error') {
    plugin.error(message)
  } else {
    plugin.warn(message)
  }
}

export const keySimilarity = (options: KeySimilarityOptions): Plugin => {
  let config: ResolvedConfig | undefined
  let lastServeMessage: string | undefined
  let mode: DiagnosticMode = 'warn'
  let isSupportedFile = excludeAll
  let queue: KeyAnalysisQueue | undefined
  let resolvedOptions: ResolvedKeySimilarityOptions | undefined

  return {
    async buildEnd() {
      if (!queue) {
        return
      }
      await queue.close()
      if (config?.command === 'build') {
        reportDiagnostics(this, queue.diagnostics, mode, config.root)
      }
    },
    async buildStart() {
      if (!config) {
        throw new Error('Vite config was not resolved before buildStart.')
      }
      const resolved = resolvedOptions
      if (!resolved) {
        throw new Error('Key similarity options were not resolved.')
      }
      queue = undefined
      lastServeMessage = undefined
      if (mode === 'off') {
        return
      }
      const core = new KeySimilarityCore(resolved)
      queue = new KeyAnalysisQueue(core, resolved, {
        onError(error) {
          if (config?.command === 'serve') {
            config.logger.error(`Key similarity worker failed: ${error.message}`)
          }
        },
        onResult(result) {
          if (config?.command === 'serve') {
            const projectRoot = config.root
            const diagnostics = queue?.diagnostics ?? result.diagnostics
            const messages = createDiagnosticGroups(diagnostics).map((group, index) =>
              formatDiagnosticGroup(group, index, projectRoot),
            )
            const message =
              messages.length === 0 ? undefined : `Similar key groups:\n${messages.join('\n\n')}`
            if (message !== undefined && message !== lastServeMessage) {
              lastServeMessage = message
              config.logger.warn(message)
            }
          }
        },
      })
    },
    async closeBundle() {
      await queue?.close()
    },
    configResolved(resolvedConfig) {
      config = resolvedConfig
      resolvedOptions = resolveOptions(options, resolvedConfig.root)
      isSupportedFile = createFilter(SOURCE_FILE_PATTERN, resolvedOptions.exclude, {
        resolve: resolvedConfig.root,
      })
      mode =
        resolvedConfig.command === 'serve'
          ? (options.serveMode ?? 'warn')
          : (options.buildMode ?? 'error')
    },
    configureServer(server) {
      const removeDeletedFile = (filePath: string) => {
        if (queue) {
          queue.remove(path.resolve(filePath))
        }
      }
      server.watcher.on('unlink', removeDeletedFile)
      return () => server.watcher.off('unlink', removeDeletedFile)
    },
    enforce: 'pre',
    name: 'key-similarity',
    transform(code, id) {
      if (!queue) {
        return
      }
      const filePath = path.resolve(id.split('?')[0]!)
      if (!isSupportedFile(filePath)) {
        return
      }
      queue.enqueue(filePath, code)
    },
  }
}
