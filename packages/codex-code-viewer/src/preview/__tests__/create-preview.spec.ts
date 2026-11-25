/** @vitest-environment node */
import {rm, writeFile} from 'node:fs/promises'
import {beforeEach, expect, it, vi} from 'vitest'
import {createPreview} from './create-preview'

const state = vi.hoisted(() => ({
  errorListeners: vi.fn(),
  exitBeforeReady: vi.fn<() => boolean>(),
  startupError: vi.fn<() => Error | undefined>(),
  startupOutput: vi
    .fn<() => string[]>()
    .mockReturnValue(['Code Viewer preview: http://127.0.0.1:1234/token/\n']),
  writeError: vi.fn(),
}))
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  mkdir: vi.fn(),
  mkdtemp: async () => '/fixture',
  realpath: async (path: string) => path,
  rm: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  const {EventEmitter} = await import('node:events')
  const {PassThrough} = await import('node:stream')
  return {
    ...actual,
    spawn: () => {
      class Child extends EventEmitter {
        stdout = new PassThrough()
        stderr = new PassThrough()
        exitCode: number | null = null
        signalCode = null
        kill(): boolean {
          this.exitCode = 0
          queueMicrotask(() => this.emit('close', 0, null))
          return true
        }
      }
      const child = new Child()
      state.writeError.mockImplementation((text: string | Buffer) => child.stderr.write(text))
      state.errorListeners.mockImplementation(() => child.stderr.listenerCount('data'))
      queueMicrotask(() => {
        const error = state.startupError()
        if (error !== undefined) {
          child.emit('error', error)
        } else if (state.exitBeforeReady()) {
          child.exitCode = 1
          child.emit('exit', 1, null)
          child.stdout.write('Code Viewer preview: http://127.0.0.1:1234/token/\n')
          child.stderr.write('final startup diagnostic')
          child.emit('close', 1, null)
        } else {
          for (const chunk of state.startupOutput()) {
            child.stdout.write(chunk)
          }
        }
      })
      return child
    },
  }
})

beforeEach(() => vi.clearAllMocks())

it('should preserve a bounded stderr tail after preview startup', async () => {
  const preview = await createPreview()
  try {
    state.writeError('x'.repeat(9000))
    state.writeError('server failure after startup')
    expect(state.errorListeners()).toBe(1)
    const stderr = preview.stderr()
    expect(stderr).toBe(
      `${'x'.repeat(8192 - 'server failure after startup'.length)}server failure after startup`,
    )
  } finally {
    await preview.close()
  }
  expect(state.errorListeners()).toBe(0)
})

it('should retain the startup error when removing the preview directory also fails', async () => {
  const startup = new Error('preview startup failed')
  const cleanup = new Error('preview cleanup failed')
  state.startupError.mockReturnValueOnce(startup)
  vi.mocked(rm).mockRejectedValueOnce(cleanup)

  await expect(createPreview()).rejects.toMatchObject({errors: [startup, cleanup]})
})

it('should retain a UTF-8 diagnostic split across stderr chunks', async () => {
  const preview = await createPreview()
  try {
    const text = '파일 오류'
    const bytes = Buffer.from(text)
    state.writeError(bytes.subarray(0, 1))
    state.writeError(bytes.subarray(1))
    expect(preview.stderr()).toBe(text)
  } finally {
    await preview.close()
  }
})

it('should remove its temporary directory when a fixture file cannot be written', async () => {
  const setup = new Error('fixture file write failed')
  vi.mocked(writeFile).mockRejectedValueOnce(setup)

  await expect(createPreview({files: {'example.txt': 'test'}})).rejects.toBe(setup)
  expect(rm).toHaveBeenCalledWith('/fixture', {force: true, recursive: true})
})

it('should preserve stderr received after exit and before the preview streams close', async () => {
  state.exitBeforeReady.mockReturnValueOnce(true)

  await expect(createPreview()).rejects.toThrow(
    'Preview exited before startup: final startup diagnostic',
  )
})

it('should wait for the full startup URL when stdout arrives in pieces', async () => {
  state.startupOutput.mockReturnValueOnce([
    'Code Viewer preview: http://127.0.0.1:1234/',
    'token/\n',
  ])
  const preview = await createPreview()
  try {
    expect(preview.url).toBe('http://127.0.0.1:1234/token/')
  } finally {
    await preview.close()
  }
})
