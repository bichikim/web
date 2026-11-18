/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {createPreview} from './create-preview'

const state = vi.hoisted(() => ({errorListeners: vi.fn(), writeError: vi.fn()}))
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
      state.writeError.mockImplementation((text: string) => child.stderr.write(text))
      state.errorListeners.mockImplementation(() => child.stderr.listenerCount('data'))
      queueMicrotask(() =>
        child.stdout.write('Code Viewer preview: http://127.0.0.1:1234/token/\n'),
      )
      return child
    },
  }
})

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
