import {describe, expect, it, vi} from 'vitest'
import {SecretVaultError} from '../errors'

vi.mock('execa', () => ({
  execa: vi.fn(),
}))

import {execa} from 'execa'
import {runCommand} from '../process'

describe('runCommand', () => {
  it('should wrap command failures in SecretVaultError', async () => {
    vi.mocked(execa).mockRejectedValue({
      message: 'Command failed with exit code 1',
      stderr: 'fatal: not a git repository',
      stdout: '',
    })

    await expect(runCommand('git', ['status'], {cwd: '/tmp/repo'})).rejects.toThrow(
      SecretVaultError,
    )
    await expect(runCommand('git', ['status'], {cwd: '/tmp/repo'})).rejects.toThrow(
      'Command failed (git status)',
    )
    await expect(runCommand('git', ['status'], {cwd: '/tmp/repo'})).rejects.toThrow(
      'fatal: not a git repository',
    )
  })
})
