/** @vitest-environment node */
import {execFile} from 'node:child_process'
import {homedir, tmpdir} from 'node:os'
import {mkdtemp, rm} from 'node:fs/promises'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {runPluginUpdate} from '../run-plugin-update'
import {installPlugin} from '../../installer/install-plugin'
import * as updateLock from '../with-update-lock'

vi.mock('node:child_process', async () => {
  const original = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return {...original, execFile: vi.fn()}
})
vi.mock('../../installer/install-plugin', () => ({installPlugin: vi.fn()}))
let directory: string
beforeEach(async () => {
  vi.resetAllMocks()
  vi.mocked(installPlugin).mockResolvedValue(undefined)
  directory = await mkdtemp(join(tmpdir(), 'viewer-update-adapter-'))
  vi.stubEnv('CODEX_HOME', join(directory, 'codex'))
  vi.stubEnv('CLAUDE_CONFIG_DIR', join(directory, 'claude'))
})
afterEach(async () => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  await rm(directory, {force: true, recursive: true})
})
describe('runPluginUpdate', () => {
  it('should resolve a relative Claude profile against the installer working directory', async () => {
    vi.stubEnv('CLAUDE_CONFIG_DIR', 'relative-profile')
    const lock = vi
      .spyOn(updateLock, 'withUpdateLock')
      .mockImplementation(async (_home, operation) => {
        await operation()
      })
    vi.mocked(execFile).mockImplementation((_file, _args, _options, callback) => {
      callback?.(null, '', '')
      return {} as ReturnType<typeof execFile>
    })
    try {
      await runPluginUpdate('0.7.0', 'claude')
      expect(lock).toHaveBeenCalledWith(join(homedir(), 'relative-profile'), expect.any(Function))
    } finally {
      lock.mockRestore()
    }
  })
  it('should reject a second installation for the same profile while another viewer is installing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'viewer-update-race-'))
    vi.stubEnv('CODEX_HOME', root)
    const started = Promise.withResolvers<void>()
    const finish = Promise.withResolvers<void>()
    vi.mocked(installPlugin).mockImplementationOnce(() => {
      started.resolve()
      return finish.promise
    })
    const first = runPluginUpdate('0.7.0', 'codex')
    await started.promise
    try {
      await expect(runPluginUpdate('0.7.0', 'codex')).rejects.toThrow()
      expect(installPlugin).toHaveBeenCalledOnce()
    } finally {
      finish.resolve()
      await first
      vi.unstubAllEnvs()
      await rm(root, {force: true, recursive: true})
    }
  })
  it('should reuse the Codex installer for the checked version and selected profile', async () => {
    vi.stubEnv('CODEX_BINARY', '/test/codex')
    const profile = join(directory, 'custom-profile')
    vi.stubEnv('CODEX_HOME', profile)
    try {
      await runPluginUpdate('0.7.0', 'codex')
      expect(installPlugin).toHaveBeenCalledWith({
        codex: '/test/codex',
        home: profile,
        version: '0.7.0',
      })
      expect(execFile).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it('should execute the pinned npm installer without a shell and inherit profile settings', async () => {
    vi.mocked(execFile).mockImplementation((_file, _args, _options, callback) => {
      callback?.(null, '', '')
      return {} as ReturnType<typeof execFile>
    })
    await runPluginUpdate('0.7.0', 'claude')
    expect(execFile).toHaveBeenCalledWith(
      'npx',
      [
        '--yes',
        '--registry=https://registry.npmjs.org',
        '@winter-love/codex-code-viewer@0.7.0',
        'install',
        '--target',
        'claude',
      ],
      expect.objectContaining({cwd: homedir(), env: process.env}),
      expect.any(Function),
    )
  })
  it('should reject command-like versions before launching a process', async () => {
    await expect(runPluginUpdate('0.7.0; echo injected', 'codex')).rejects.toThrow()
    expect(execFile).not.toHaveBeenCalled()
  })
  it('should propagate installer failures', async () => {
    vi.mocked(execFile).mockImplementation((_file, _args, _options, callback) => {
      callback?.(new Error('npx missing'), '', '')
      return {} as ReturnType<typeof execFile>
    })
    await expect(runPluginUpdate('0.7.0', 'claude')).rejects.toThrow('npx missing')
  })
})
