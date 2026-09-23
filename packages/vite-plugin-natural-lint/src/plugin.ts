import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {createFilter, type Plugin, type ResolvedConfig, type ViteDevServer} from 'vite'
import {resolveOptions} from './config'
import {NaturalLintCore} from './core'
import {formatDiagnostic, formatExperimentReports} from './diagnostics'
import {analyzeProject} from './project'
import {createPlatformProviderFactory} from './provider'
import type {
  DecisionProviderFactory,
  DiagnosticMode,
  FileAnalysisReport,
  NaturalLintDiagnostic,
  NaturalLintOptions,
  ProjectAnalysisReport,
  ResolvedNaturalLintOptions,
} from './types'

const reportDiagnostics = (
  plugin: {error(message: string): never; warn(message: string): void},
  diagnostics: ReadonlyArray<NaturalLintDiagnostic>,
  mode: DiagnosticMode,
): void => {
  if (mode === 'off' || diagnostics.length === 0) {
    return
  }
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length
  const warningCount = diagnostics.length - errorCount
  const summary = [
    `Natural lint found ${errorCount} error${errorCount === 1 ? '' : 's'}`,
    `and ${warningCount} warning${warningCount === 1 ? '' : 's'}.`,
  ].join(' ')
  const message = [summary, ...diagnostics.map(formatDiagnostic)].join('\n')
  if (mode === 'error' && errorCount > 0) {
    plugin.error(message)
  }
  plugin.warn(message)
}

const sameDiagnostics = (
  left: ReadonlyArray<NaturalLintDiagnostic>,
  right: ReadonlyArray<NaturalLintDiagnostic>,
): boolean =>
  left.length === right.length &&
  left.every((diagnostic, index) => JSON.stringify(diagnostic) === JSON.stringify(right[index]))

const rejectAllFiles = (_filePath: string): boolean => false

export class NaturalLintSession {
  private readonly diagnostics = new Map<string, ReadonlyArray<NaturalLintDiagnostic>>()
  private readonly revisions = new Map<string, number>()

  constructor(
    private readonly core: NaturalLintCore,
    private readonly options: ResolvedNaturalLintOptions,
  ) {}

  get allDiagnostics(): ReadonlyArray<NaturalLintDiagnostic> {
    return [...this.diagnostics.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([, diagnostics]) => diagnostics)
  }

  async initialize(): Promise<ProjectAnalysisReport> {
    const report = await analyzeProject(this.core, this.options)
    this.diagnostics.clear()
    for (const diagnostic of report.diagnostics) {
      if (!this.revisions.has(path.resolve(diagnostic.filePath))) {
        const existing = this.diagnostics.get(diagnostic.filePath) ?? []
        this.diagnostics.set(diagnostic.filePath, [...existing, diagnostic])
      }
    }
    return report
  }

  reserve(filePath: string): number {
    const resolvedPath = path.resolve(filePath)
    const revision = (this.revisions.get(resolvedPath) ?? 0) + 1
    this.revisions.set(resolvedPath, revision)
    return revision
  }

  async update(
    filePath: string,
    sourceText: string,
    revision = this.reserve(filePath),
  ): Promise<FileAnalysisReport | undefined> {
    const resolvedPath = path.resolve(filePath)
    const report = await this.core.analyzeFile(resolvedPath, sourceText)
    if (this.revisions.get(resolvedPath) !== revision) {
      return undefined
    }
    const previousDiagnostics = this.diagnostics.get(resolvedPath) ?? []
    this.diagnostics.set(resolvedPath, report.diagnostics)
    return sameDiagnostics(previousDiagnostics, report.diagnostics) ? undefined : report
  }

  remove(filePath: string): void {
    const resolvedPath = path.resolve(filePath)
    this.reserve(resolvedPath)
    this.diagnostics.delete(resolvedPath)
  }

  close(): Promise<void> {
    return this.core.close()
  }
}

interface WatcherOptions {
  readonly accepts: (filePath: string) => boolean
  readonly closeSession: () => Promise<void>
  readonly getSession: () => NaturalLintSession | undefined
  readonly scheduleUpdate: (filePath: string, readSource: () => Promise<string>) => void
}

const attachWatcher = (server: ViteDevServer, options: WatcherOptions): void => {
  server.watcher.on('add', (filePath) => {
    if (options.getSession() === undefined || !options.accepts(filePath)) {
      return
    }
    options.scheduleUpdate(filePath, () => readFile(filePath, 'utf8'))
  })
  server.watcher.on('unlink', (filePath) => options.getSession()?.remove(filePath))
  server.watcher.once('close', () => {
    options.closeSession().catch((error: unknown) => server.config.logger.error(String(error)))
  })
}

export const naturalLint = (
  sourceOptions: NaturalLintOptions,
  sourceProviderFactory?: DecisionProviderFactory,
): Plugin => {
  let config: ResolvedConfig | undefined
  let accepts = rejectAllFiles
  let buildAnalysis: Promise<ProjectAnalysisReport> | undefined
  let mode: DiagnosticMode = 'warn'
  let options: ResolvedNaturalLintOptions | undefined
  let projectReport: ProjectAnalysisReport | undefined
  let session: NaturalLintSession | undefined
  let serveQueue = Promise.resolve()

  const enqueueServeTask = (task: () => Promise<void>): void => {
    serveQueue = serveQueue.then(task).catch((error: unknown) => {
      config?.logger.error(`Natural lint background task failed: ${String(error)}`)
    })
  }

  const scheduleUpdate = (filePath: string, readSource: () => Promise<string>): void => {
    const revision = session?.reserve(filePath)
    enqueueServeTask(async () => {
      const report = await session?.update(filePath, await readSource(), revision)
      if (report !== undefined) {
        reportDiagnostics(
          {
            error: (message) => {
              throw new Error(message)
            },
            warn: config?.logger.warn ?? (() => undefined),
          },
          report.diagnostics,
          mode,
        )
      }
    })
  }

  const closeSession = async (): Promise<void> => {
    await serveQueue
    await session?.close()
  }

  return {
    async buildEnd() {
      if (config?.command === 'build') {
        try {
          projectReport = await buildAnalysis
          if (projectReport !== undefined && projectReport.experiments.length > 0) {
            config.logger.info(formatExperimentReports(projectReport.experiments))
          }
          reportDiagnostics(this, session?.allDiagnostics ?? [], mode)
        } finally {
          await closeSession()
        }
      }
    },
    async buildStart() {
      if (config === undefined || options === undefined) {
        throw new Error('Natural lint options were not resolved before buildStart.')
      }
      if (mode === 'off') {
        return
      }
      const providerFactory = sourceProviderFactory ?? createPlatformProviderFactory(options.laya)
      session = new NaturalLintSession(new NaturalLintCore(options, providerFactory), options)
      if (config.command === 'serve') {
        enqueueServeTask(async () => {
          const report = await session?.initialize()
          if (report !== undefined) {
            projectReport = report
            if (report.experiments.length > 0) {
              config?.logger.info(formatExperimentReports(report.experiments))
            }
            reportDiagnostics(this, session?.allDiagnostics ?? [], mode)
          }
        })
        return
      }
      buildAnalysis = session.initialize()
    },
    async closeBundle() {
      await closeSession()
    },
    configResolved(resolvedConfig) {
      config = resolvedConfig
      options = resolveOptions(sourceOptions, resolvedConfig.root)
      accepts = createFilter(options.include, options.exclude, {resolve: options.root})
      mode =
        resolvedConfig.command === 'serve'
          ? (sourceOptions.serveMode ?? 'warn')
          : (sourceOptions.buildMode ?? 'error')
    },
    configureServer(server) {
      attachWatcher(server, {
        accepts,
        closeSession,
        getSession: () => session,
        scheduleUpdate,
      })
    },
    enforce: 'pre',
    handleHotUpdate(context) {
      if (session === undefined || mode === 'off' || !accepts(context.file)) {
        return
      }
      scheduleUpdate(context.file, () => Promise.resolve(context.read()))
    },
    name: 'natural-lint',
  }
}
