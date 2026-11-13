import {type ChildProcessWithoutNullStreams, spawn} from 'node:child_process'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createNativeTransport} from '../create-native-transport'

vi.mock('node:child_process', () => {
  const spawn = vi.fn()
  return {default: {spawn}, spawn}
})

const childProcess = () => {
  const child = Object.assign(new EventEmitter(), {
    exitCode: null as number | null,
    kill: vi.fn(() => {
      child.signalCode = 'SIGTERM'
      queueMicrotask(() => child.emit('close', null, 'SIGTERM'))
      return true
    }),
    pid: 123,
    signalCode: null as NodeJS.Signals | null,
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    stdout: new PassThrough(),
  })
  return child
}

describe('createNativeTransport', () => {
  let child: ReturnType<typeof childProcess>
  let transport: ReturnType<typeof createNativeTransport> | undefined
  beforeEach(() => {
    child = childProcess()
    vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcessWithoutNullStreams)
  })
  afterEach(async () => {
    await transport?.dispose(Promise.resolve())
    child.stdin.destroy()
    child.stdout.destroy()
    child.stderr.destroy()
    vi.clearAllMocks()
  })
  const start = () => {
    transport = createNativeTransport({binary: '/analyzer', onStderr: vi.fn(), root: '/workspace'})
    child.emit('spawn')
    return transport
  }
  it('should launch in the workspace and wait for process readiness', async () => {
    const current = start()
    await current.started
    expect(spawn).toHaveBeenCalledWith('/analyzer', ['--lsp', '--stdio'], {
      cwd: '/workspace',
      stdio: 'pipe',
    })
  })
  it('should reject startup errors and finish disposal', async () => {
    transport = createNativeTransport({binary: '/missing', onStderr: vi.fn(), root: '/workspace'})
    const rejected = expect(transport.started).rejects.toThrow('not installed')
    child.emit('error', new Error('not installed'))
    child.emit('close', -1)
    await rejected
    await expect(transport.dispose(Promise.resolve())).resolves.toBeUndefined()
  })
  it('should reject an active request when the analyzer exits', async () => {
    const current = start()
    const sent = new Promise<void>((resolve) => {
      const receive = (chunk: Buffer): void => {
        if (chunk.toString().includes('"method":"initialize"')) {
          child.stdin.off('data', receive)
          resolve()
        }
      }
      child.stdin.on('data', receive)
    })
    const rejected = expect(current.connection.sendRequest('initialize', {})).rejects.toThrow()
    await sent
    child.exitCode = 1
    child.emit('exit', 1)
    child.emit('close', 1)
    await rejected
  })
  it('should wait for initialization cleanup and kill only once on repeated disposal', async () => {
    const current = start()
    const initialization = Promise.withResolvers<void>()
    const first = current.dispose(initialization.promise)
    const second = current.dispose(initialization.promise)
    expect(first).toBe(second)
    expect(child.kill).toHaveBeenCalledOnce()
    initialization.resolve()
    await first
  })
  it('should forward stderr without parsing or retaining it in the transport', () => {
    const receive = vi.fn()
    transport = createNativeTransport({binary: '/analyzer', onStderr: receive, root: '/workspace'})
    child.emit('spawn')
    child.stderr.write('analysis failed')
    expect(receive).toHaveBeenCalledWith('analysis failed')
  })
})
