import {SERVER_AI_RELEASED} from '../../features/ai-job/release.ts'
// oxlint-disable no-magic-numbers -- Default runner limits and the TCP port range are operational constants.
// oxlint-disable no-void -- Signal handlers intentionally detach shutdown from the event callback.

import {mkdir} from 'node:fs/promises'
import type {Server} from 'node:http'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'

import {createWorkerExecutor} from './worker-executor.ts'
import {createRunnerHttpServer} from './http.ts'
import {createRunnerService} from './service.ts'
import {createRunnerArtifactStore} from './storage.ts'
import {SqliteRunnerJobStore} from './store.ts'
import type {RunnerService} from './types.ts'

interface RunnerEnvironment {
  readonly POMO_AI_RUNNER_DB_PATH?: string
  readonly POMO_AI_RUNNER_HOST?: string
  readonly POMO_AI_RUNNER_MODEL_CACHE_DIR?: string
  readonly POMO_AI_RUNNER_PORT?: string
  readonly POMO_AI_RUNNER_TIMEOUT_MS?: string
  readonly POMO_AI_RUNNER_TOKEN?: string
  readonly POMO_AI_RUNNER_STORAGE_PATH?: string
  readonly [key: string]: string | undefined
}

interface RunnerConfig {
  readonly databasePath: string
  readonly host: string
  readonly modelCacheDirectory?: string
  readonly port: number
  readonly timeoutMs: number
  readonly token: string
}

interface StartedRunner {
  readonly close: () => Promise<void>
  readonly service: RunnerService
  readonly stop: () => Promise<void>
}

const DEFAULT_DATABASE_PATH = './.data/pomo-ai-runner.sqlite'
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 8788
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000

const getPositiveInteger = (value: string | undefined, fallback: number, name: string): number => {
  if (value === undefined || value.trim().length === 0) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

const resolveConfig = (environment: RunnerEnvironment): RunnerConfig => {
  const token = environment.POMO_AI_RUNNER_TOKEN?.trim()
  if (token === undefined || token.length === 0) {
    throw new Error('POMO_AI_RUNNER_TOKEN is required')
  }
  const port = getPositiveInteger(
    environment.POMO_AI_RUNNER_PORT,
    DEFAULT_PORT,
    'POMO_AI_RUNNER_PORT',
  )
  if (port > 65_535) {
    throw new Error('POMO_AI_RUNNER_PORT is out of range')
  }
  return {
    databasePath: resolve(environment.POMO_AI_RUNNER_DB_PATH?.trim() || DEFAULT_DATABASE_PATH),
    host: environment.POMO_AI_RUNNER_HOST?.trim() || DEFAULT_HOST,
    modelCacheDirectory: environment.POMO_AI_RUNNER_MODEL_CACHE_DIR?.trim() || undefined,
    port,
    timeoutMs: getPositiveInteger(
      environment.POMO_AI_RUNNER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      'POMO_AI_RUNNER_TIMEOUT_MS',
    ),
    token,
  }
}

const listen = (server: Server, config: RunnerConfig): Promise<void> =>
  new Promise<void>((resolvePromise, reject) => {
    const handleError = (error: Error) => {
      server.off('listening', handleListening)
      reject(error)
    }
    const handleListening = () => {
      server.off('error', handleError)
      resolvePromise()
    }
    server.once('error', handleError)
    server.once('listening', handleListening)
    server.listen(config.port, config.host)
  })

const closeServer = (server: Server): Promise<void> => {
  if (!server.listening) {
    return Promise.resolve()
  }
  return new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error === undefined ? resolvePromise() : reject(error)))
  })
}

const initializeService = (config: RunnerConfig, environment: RunnerEnvironment): RunnerService => {
  const jobStore = new SqliteRunnerJobStore(config.databasePath)
  try {
    return createRunnerService({
      artifactStore: createRunnerArtifactStore(environment),
      executor: createWorkerExecutor({modelCacheDirectory: config.modelCacheDirectory}),
      jobStore,
      timeoutMs: config.timeoutMs,
    })
  } catch (error: unknown) {
    jobStore.close()
    throw error
  }
}

export const startRunner = async (
  environment: RunnerEnvironment = process.env,
): Promise<StartedRunner> => {
  // 의도적인 출시 보류: DB 생성, 작업 복구, 포트 바인딩 전에 멈춘다.
  if (!SERVER_AI_RELEASED) {
    throw new Error('Server AI is unreleased; runner startup is disabled')
  }
  const config = resolveConfig(environment)
  await mkdir(dirname(config.databasePath), {recursive: true})
  const service = initializeService(config, environment)
  const server = createRunnerHttpServer({service, token: config.token})
  let shutdown: Promise<void> | undefined
  const close = (): Promise<void> => {
    shutdown ??= closeServer(server).finally(() => service.close())
    return shutdown
  }
  try {
    await listen(server, config)
    // A failed duplicate bind must not recover jobs owned by the running process.
    service.recover()
  } catch (error: unknown) {
    await close()
    throw error
  }
  return {close, service, stop: close}
}

const isMainModule = resolve(process.argv[1] ?? '') === resolve(fileURLToPath(import.meta.url))

if (isMainModule) {
  const runner = await startRunner()
  const stop = () => {
    void runner.stop().finally(() => process.exit(0))
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  console.log('Pomo AI runner listening')
}
