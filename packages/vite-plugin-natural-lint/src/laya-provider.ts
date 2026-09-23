import {type ChildProcessWithoutNullStreams, spawn} from 'node:child_process'
import {createHash, randomUUID} from 'node:crypto'
import {access, mkdir, rename, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {createInterface} from 'node:readline'
import {
  type CoremlRuntimeProvisioner,
  ensureCoremlRuntime,
  type PreparedCoremlRuntime,
} from './coreml-runtime'
import {
  formatDecisionQuestions,
  LAYA_DECISION_VERSION,
  normalizeDecisionAnswers,
} from './laya-decision'
import type {
  DecisionAnswers,
  DecisionProvider,
  DecisionProviderFactory,
  DecisionRequest,
  ResolvedCoremlLayaOptions,
} from './types'

interface PendingDecision {
  readonly reject: (error: Error) => void
  readonly resolve: (result: BridgeResult) => void
}

interface BridgeResult {
  readonly answers?: unknown
  readonly id: number
  readonly error?: string
  readonly type: 'result'
}

interface BridgeReady {
  readonly type: 'ready'
}

type BridgeMessage = BridgeReady | BridgeResult

const LAYA_COREML_VERSION = '0.1.0'

const bridgeArguments = (
  options: ResolvedCoremlLayaOptions,
  allowDownload: boolean,
): ReadonlyArray<string> => [
  options.bridgePath,
  '--model',
  options.model,
  '--revision',
  options.modelRevision,
  ...(options.computeUnits === undefined ? [] : ['--compute-units', options.computeUnits]),
  ...(allowDownload ? ['--allow-download'] : []),
]

const resolveRuntime = async (
  options: ResolvedCoremlLayaOptions,
  provisionRuntime: CoremlRuntimeProvisioner,
): Promise<PreparedCoremlRuntime> => {
  if (options.coreml.runtime === 'managed') {
    return provisionRuntime(options.coreml.runtimeDir)
  }
  return {environment: process.env, pythonPath: options.pythonPath}
}

class LayaProvider implements DecisionProvider {
  private closed = false
  private identifier = 0
  private readonly pending = new Map<number, PendingDecision>()
  private readonly ready: Promise<void>
  private rejectReady: ((error: Error) => void) | undefined
  private resolveReady: (() => void) | undefined
  private readonly standardError: string[] = []

  constructor(private readonly process: ChildProcessWithoutNullStreams) {
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })
    createInterface({input: process.stdout}).on('line', (line) => this.receive(line))
    createInterface({input: process.stderr}).on('line', (line) => {
      this.standardError.push(line)
    })
    process.once('error', (error) => this.fail(error))
    process.once('exit', (code, signal) => {
      if (!this.closed) {
        const detail = this.standardError.join('\n')
        const processState = `code=${String(code)}, signal=${String(signal)}`
        const processDetail = detail.length === 0 ? '' : `\n${detail}`
        this.fail(new Error(`Laya bridge exited before close (${processState}).${processDetail}`))
      }
    })
  }

  async decide(request: DecisionRequest): Promise<DecisionAnswers> {
    const result = await this.request({
      questions: formatDecisionQuestions(request.questions),
      ruleId: request.ruleId,
      state: request.state,
    })
    if (result.answers === undefined) {
      throw new Error('Laya bridge result did not include answers.')
    }
    return normalizeDecisionAnswers(request.questions, result.answers)
  }

  private async request(payload: Readonly<Record<string, unknown>>): Promise<BridgeResult> {
    await this.ready
    if (this.closed) {
      throw new Error('Laya bridge is closed.')
    }
    const {identifier} = this
    this.identifier += 1
    const result = new Promise<BridgeResult>((resolve, reject) => {
      this.pending.set(identifier, {reject, resolve})
    })
    this.process.stdin.write(`${JSON.stringify({...payload, id: identifier})}\n`)
    return result
  }

  async initialize(): Promise<void> {
    await this.ready
  }

  abort(): void {
    if (this.closed) {
      return
    }
    this.closed = true
    this.process.stdin.destroy()
    this.process.kill()
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }
    this.closed = true
    this.process.stdin.end()
    if (this.process.exitCode === null && this.process.signalCode === null) {
      await new Promise<void>((resolve) => {
        this.process.once('exit', () => resolve())
      })
    }
  }

  private receive(line: string): void {
    let message: BridgeMessage
    try {
      message = JSON.parse(line) as BridgeMessage
    } catch (cause: unknown) {
      this.fail(new Error('Laya bridge returned invalid JSON.', {cause}))
      return
    }
    switch (message.type) {
      case 'ready': {
        this.resolveReady?.()
        this.resolveReady = undefined
        this.rejectReady = undefined
        return
      }
      case 'result': {
        const pending = this.pending.get(message.id)
        if (pending === undefined) {
          return
        }
        this.pending.delete(message.id)
        if (message.error === undefined) {
          pending.resolve(message)
          return
        }
        pending.reject(new Error(`Laya decision failed: ${message.error}`))
        return
      }
      default: {
        const unexpected: never = message
        this.fail(new Error(`Unknown Laya bridge message: ${JSON.stringify(unexpected)}`))
      }
    }
  }

  private fail(error: Error): void {
    this.rejectReady?.(error)
    this.rejectReady = undefined
    this.resolveReady = undefined
    for (const pending of this.pending.values()) {
      pending.reject(error)
    }
    this.pending.clear()
  }
}

const modelMarkerPath = (options: ResolvedCoremlLayaOptions): string => {
  const identifier = createHash('sha256')
    .update(`${options.model}\0${options.modelRevision}`)
    .digest('hex')
  return path.join(options.coreml.runtimeDir, 'models', `${identifier}.ready`)
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const writeModelMarker = async (markerPath: string, revision: string): Promise<void> => {
  await mkdir(path.dirname(markerPath), {recursive: true})
  const temporaryPath = `${markerPath}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, revision)
    await rename(temporaryPath, markerPath)
  } finally {
    await rm(temporaryPath, {force: true})
  }
}

export const createLayaProviderFactory = (
  options: ResolvedCoremlLayaOptions,
  provisionRuntime: CoremlRuntimeProvisioner = ensureCoremlRuntime,
): DecisionProviderFactory => ({
  async create() {
    const runtime = await resolveRuntime(options, provisionRuntime)
    const markerPath = modelMarkerPath(options)
    const allowDownload = options.coreml.runtime === 'managed' && !(await fileExists(markerPath))
    const startProvider = async (downloadAllowed: boolean): Promise<LayaProvider> => {
      const childProcess = spawn(
        runtime.pythonPath,
        [...bridgeArguments(options, downloadAllowed)],
        {
          env: {...runtime.environment},
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      )
      const provider = new LayaProvider(childProcess)
      try {
        await provider.initialize()
        return provider
      } catch (error: unknown) {
        provider.abort()
        throw error
      }
    }
    if (allowDownload) {
      process.stderr.write(
        [
          `[natural-lint] Preparing model ${options.model}@${options.modelRevision}.`,
          'The first run requires network access.\n',
        ].join(' '),
      )
    }
    let provider: LayaProvider
    let downloaded = allowDownload
    try {
      provider = await startProvider(allowDownload)
    } catch (error: unknown) {
      if (options.coreml.runtime !== 'managed' || allowDownload) {
        throw error
      }
      process.stderr.write(
        [
          '[natural-lint] The prepared model cache could not start;',
          `rebuilding ${options.model}@${options.modelRevision}.\n`,
        ].join(' '),
      )
      await rm(markerPath, {force: true})
      provider = await startProvider(true)
      downloaded = true
    }
    if (downloaded) {
      await writeModelMarker(markerPath, options.modelRevision)
    }
    return provider
  },
  identifier: [
    `laya-coreml@${LAYA_COREML_VERSION}`,
    `decision@${LAYA_DECISION_VERSION}`,
    options.coreml.runtime,
    options.model,
  ].join('/'),
  revision: options.modelRevision,
})
