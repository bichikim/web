/** @vitest-environment node */
import {createServer, type Server} from 'node:http'
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const state = vi.hoisted(() => ({
  close: vi.fn(async () => undefined),
  recover: vi.fn(),
  storage: vi.fn(() => ({})),
  storeClose: vi.fn(),
}))
vi.mock('../service', () => ({
  createRunnerService: () => ({close: state.close, recover: state.recover}),
}))
vi.mock('../storage', () => ({createRunnerArtifactStore: state.storage}))
vi.mock('../store', () => ({
  SqliteRunnerJobStore: class {
    close = state.storeClose
  },
}))
vi.mock('../worker-executor', () => ({createWorkerExecutor: () => vi.fn()}))
import {startRunner} from '../index'

let directory: string
const servers: Server[] = []
const runners: Array<Awaited<ReturnType<typeof startRunner>>> = []
const listen = async () => {
  const server = createServer()
  servers.push(server)
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Expected a TCP address')
  }
  return {port: address.port, server}
}
const environment = (port: number) => ({
  POMO_AI_RUNNER_DB_PATH: join(directory, 'jobs.sqlite'),
  POMO_AI_RUNNER_PORT: String(port),
  POMO_AI_RUNNER_TOKEN: 'test-runner-token',
})
beforeEach(async () => {
  vi.clearAllMocks()
  state.close.mockResolvedValue(undefined)
  state.recover.mockReset()
  state.storage.mockReset().mockReturnValue({})
  directory = await mkdtemp(join(tmpdir(), 'pomo-runner-start-'))
})
afterEach(async () => {
  await Promise.all(runners.splice(0).map((runner) => runner.close()))
  await Promise.all(
    servers
      .splice(0)
      .filter((server) => server.listening)
      .map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve())
          }),
      ),
  )
  await rm(directory, {force: true, recursive: true})
})
it('should not recover jobs when the listening port is already occupied', async () => {
  const {port} = await listen()
  await expect(startRunner(environment(port))).rejects.toMatchObject({code: 'EADDRINUSE'})
  expect(state.recover).not.toHaveBeenCalled()
  expect(state.close).toHaveBeenCalledOnce()
})
it('should close the database when artifact configuration fails', async () => {
  state.storage.mockImplementation(() => {
    throw new Error('Invalid storage')
  })
  await expect(startRunner(environment(8788))).rejects.toThrow('Invalid storage')
  expect(state.storeClose).toHaveBeenCalledOnce()
})
it('should release the port when recovery fails', async () => {
  const {port, server} = await listen()
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
  state.recover.mockImplementation(() => {
    throw new Error('Recovery failed')
  })
  await expect(startRunner(environment(port))).rejects.toThrow('Recovery failed')
  expect(state.close).toHaveBeenCalledOnce()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
})
it('should share shutdown across repeated close calls', async () => {
  const {port, server} = await listen()
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
  const runner = await startRunner(environment(port))
  runners.push(runner)
  await Promise.all([runner.close(), runner.stop()])
  expect(state.close).toHaveBeenCalledOnce()
})

// Exercise the retained implementation without changing the production release decision.
vi.mock('src/features/ai-job/release', () => ({SERVER_AI_RELEASED: true}))
