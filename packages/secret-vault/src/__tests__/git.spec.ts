import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {commitAndPush} from '../git'
import {writeVaultValues} from '../vault'
import type {CommandRunner, Prompt} from '../types'

class MockCommandError extends Error {
  constructor(
    message: string,
    readonly stdout: string,
    readonly stderr: string,
  ) {
    super(message)
  }
}

const createPrompt = (confirm: boolean): Prompt => ({
  confirm: async () => confirm,
  passphrase: async () => 'passphrase',
  value: async () => 'value',
})

const createProject = async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-git-'))
  const repoPath = path.join(tmpDir, 'repo')
  const vaultPath = path.join(repoPath, 'app', 'vault.json')

  await fs.promises.mkdir(path.join(repoPath, '.git'), {recursive: true})
  await writeVaultValues(vaultPath, 'plain', {foo: 'bar'}, undefined)

  return {
    repoPath,
    tmpDir,
    vaultPath,
  }
}

describe('commitAndPush', () => {
  it('should pull with merge before push', async () => {
    const {repoPath, tmpDir, vaultPath} = await createProject()
    const commands: string[] = []

    const runner: CommandRunner = async (file, args) => {
      commands.push(`${file} ${args.join(' ')}`)

      if (file === 'git' && args[0] === 'diff') {
        return {stderr: '', stdout: 'app/vault.json\n'}
      }

      return {stderr: '', stdout: ''}
    }

    try {
      await expect(
        commitAndPush({prompt: createPrompt(true), runner}, repoPath, 'app', vaultPath),
      ).resolves.toBe(true)

      const pullIndex = commands.findIndex((command) => command.includes('pull --no-rebase'))
      const pushIndex = commands.findIndex((command) => command === 'git push')

      expect(pullIndex).toBeGreaterThan(-1)
      expect(pushIndex).toBeGreaterThan(pullIndex)
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should resolve merge conflict when overwrite is confirmed', async () => {
    const {repoPath, tmpDir, vaultPath} = await createProject()
    const localContent = await fs.promises.readFile(vaultPath, 'utf8')
    const commands: string[] = []

    const runner: CommandRunner = async (file, args) => {
      commands.push(`${file} ${args.join(' ')}`)

      if (file === 'git' && args[0] === 'diff') {
        return {stderr: '', stdout: 'app/vault.json\n'}
      }

      if (file === 'git' && args[0] === 'pull') {
        await fs.promises.writeFile(path.join(repoPath, '.git', 'MERGE_HEAD'), 'deadbeef\n', 'utf8')
        throw new MockCommandError(
          'git pull failed',
          '',
          'CONFLICT (content): Merge conflict in app/vault.json',
        )
      }

      return {stderr: '', stdout: ''}
    }

    try {
      await expect(
        commitAndPush({prompt: createPrompt(true), runner}, repoPath, 'app', vaultPath),
      ).resolves.toBe(true)

      expect(commands).toContain('git checkout --ours -- app/vault.json')
      expect(commands).toContain('git commit --no-edit')
      expect(await fs.promises.readFile(vaultPath, 'utf8')).toBe(localContent)
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should abort merge and guide manual resolution when overwrite is declined', async () => {
    const {repoPath, tmpDir, vaultPath} = await createProject()
    const commands: string[] = []

    const runner: CommandRunner = async (file, args) => {
      commands.push(`${file} ${args.join(' ')}`)

      if (file === 'git' && args[0] === 'diff') {
        return {stderr: '', stdout: 'app/vault.json\n'}
      }

      if (file === 'git' && args[0] === 'pull') {
        await fs.promises.writeFile(path.join(repoPath, '.git', 'MERGE_HEAD'), 'deadbeef\n', 'utf8')
        throw new MockCommandError(
          'git pull failed',
          '',
          'CONFLICT (content): Merge conflict in app/vault.json',
        )
      }

      return {stderr: '', stdout: ''}
    }

    try {
      await expect(
        commitAndPush({prompt: createPrompt(false), runner}, repoPath, 'app', vaultPath),
      ).rejects.toThrow('Vault push cancelled due to a merge conflict.')

      expect(commands).toContain('git merge --abort')
      expect(commands.some((command) => command === 'git push')).toBe(false)
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})
