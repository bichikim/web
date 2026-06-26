import {describe, expect, it} from 'vitest'
import {normalizeNamespace, resolveNamespace} from '../namespace'
import type {CommandRunner} from '../types'

describe('namespace', () => {
  it('should convert namespace to filesystem-safe value', () => {
    expect(normalizeNamespace('git@github.com:owner/private-secret-vault.git')).toBe(
      'git-github.com-owner-private-secret-vault',
    )
  })

  it('should reject reserved namespaces', () => {
    expect(() => normalizeNamespace('.')).toThrow(
      'Namespace must be a single filesystem-safe path segment',
    )
    expect(() => normalizeNamespace('..')).toThrow(
      'Namespace must be a single filesystem-safe path segment',
    )
  })

  it('should use config namespace before git remote', async () => {
    const runner: CommandRunner = async () => {
      throw new Error('runner should not be called')
    }

    await expect(
      resolveNamespace({
        configNamespace: 'my app',
        cwd: '/tmp/project',
        runner,
      }),
    ).resolves.toBe('my-app')
  })

  it('should prefer cli namespace over config namespace', async () => {
    const runner: CommandRunner = async () => {
      throw new Error('runner should not be called')
    }

    await expect(
      resolveNamespace({
        cliNamespace: 'cli app',
        configNamespace: 'config-app',
        cwd: '/tmp/project',
        runner,
      }),
    ).resolves.toBe('cli-app')
  })

  it('should fallback to git remote origin', async () => {
    const runner: CommandRunner = async (file, args) => {
      expect(file).toBe('git')
      expect(args).toEqual(['remote', 'get-url', 'origin'])

      return {
        stderr: '',
        stdout: 'git@github.com:owner/app.git',
      }
    }

    await expect(
      resolveNamespace({
        cwd: '/tmp/project',
        runner,
      }),
    ).resolves.toBe('git-github.com-owner-app')
  })
})
