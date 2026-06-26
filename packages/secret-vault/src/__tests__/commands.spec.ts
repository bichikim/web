import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {addSecret, importSecrets, modifySecret, syncSecrets} from '../commands'
import {getVaultFilePath, writeVaultValues} from '../vault'
import type {CommandRunner, Prompt} from '../types'

const createRunner = (repoPath: string): CommandRunner => {
  return async (file, args) => {
    if (file === 'git' && args[0] === 'remote') {
      return {
        stderr: '',
        stdout: 'git@github.com:owner/app.git',
      }
    }

    if (file === 'git' && args[0] === 'pull') {
      return {
        stderr: '',
        stdout: '',
      }
    }

    if (file === 'git' && args[0] === 'checkout') {
      return {
        stderr: '',
        stdout: '',
      }
    }

    if (file === 'git' && args[0] === 'merge') {
      return {
        stderr: '',
        stdout: '',
      }
    }

    if (file === 'git' && args[0] === 'add') {
      return {
        stderr: '',
        stdout: '',
      }
    }

    if (file === 'git' && args[0] === 'diff') {
      return {
        stderr: '',
        stdout: `${args[args.length - 1] ?? 'vault.json'}\n`,
      }
    }

    if (file === 'git' && args[0] === 'commit') {
      return {
        stderr: '',
        stdout: '',
      }
    }

    if (file === 'git' && args[0] === 'push') {
      return {
        stderr: '',
        stdout: '',
      }
    }

    if (file === 'gh') {
      return {
        stderr: '',
        stdout: 'PRIVATE',
      }
    }

    throw new Error(`Unexpected command: ${file} ${args.join(' ')} at ${repoPath}`)
  }
}

const createPrompt = (confirm: boolean = true): Prompt => {
  return {
    confirm: async () => confirm,
    passphrase: async () => 'passphrase',
    value: async () => 'prompt-value',
  }
}

const createProject = async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-command-'))
  const repoPath = path.join(tmpDir, 'repo')
  const configPath = path.join(tmpDir, '.secret-vault.json')
  const vaultPath = getVaultFilePath(repoPath, 'app')

  await fs.promises.mkdir(path.join(repoPath, '.git'), {recursive: true})
  await fs.promises.writeFile(
    configPath,
    JSON.stringify({
      namespace: 'app',
      repository: 'git@github.com:owner/vault.git',
      storage: 'plain',
    }),
    'utf8',
  )

  return {
    configPath,
    repoPath,
    tmpDir,
    vaultPath,
  }
}

describe('commands', () => {
  it('should ask before overwriting existing add key', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    await writeVaultValues(vaultPath, 'plain', {foo: 'old'}, undefined)

    try {
      await expect(
        addSecret('foo=new', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(false),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toBe(false)
      await expect(readFileValue(vaultPath, 'foo')).resolves.toBe('old')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should ask before creating missing modify key', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    await writeVaultValues(vaultPath, 'plain', {}, undefined)

    try {
      await expect(
        modifySecret('foo=new', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toBe(true)
      await expect(readFileValue(vaultPath, 'foo')).resolves.toBe('new')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should not create missing modify key when confirm is declined', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    await writeVaultValues(vaultPath, 'plain', {}, undefined)

    try {
      await expect(
        modifySecret('foo=new', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(false),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toBe(false)
      expect(await readFileValue(vaultPath, 'foo')).toBeUndefined()
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should add secret from value option', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()

    try {
      await expect(
        addSecret('foo', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
          value: 'from-option',
        }),
      ).resolves.toBe(true)
      await expect(readFileValue(vaultPath, 'foo')).resolves.toBe('from-option')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should use cli namespace override', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    const stagingVaultPath = getVaultFilePath(repoPath, 'staging')

    try {
      await expect(
        addSecret('foo', {
          configPath,
          cwd: tmpDir,
          namespace: 'staging',
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
          value: 'staging-value',
        }),
      ).resolves.toBe(true)
      await expect(readFileValue(stagingVaultPath, 'foo')).resolves.toBe('staging-value')
      await expect(fs.promises.stat(vaultPath)).rejects.toMatchObject({code: 'ENOENT'})
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should modify secret from stdin option', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    await writeVaultValues(vaultPath, 'plain', {foo: 'old'}, undefined)

    try {
      await expect(
        modifySecret('foo', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          readStdin: async () => 'from-stdin',
          repoPath,
          runner: createRunner(repoPath),
          stdin: true,
        }),
      ).resolves.toBe(true)
      await expect(readFileValue(vaultPath, 'foo')).resolves.toBe('from-stdin')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should add secret from value prompt when no assignment value source exists', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()

    try {
      await expect(
        addSecret('foo', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toBe(true)
      await expect(readFileValue(vaultPath, 'foo')).resolves.toBe('prompt-value')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should reject multiple value sources', async () => {
    const {configPath, repoPath, tmpDir} = await createProject()

    try {
      await expect(
        addSecret('foo=bar', {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
          value: 'from-option',
        }),
      ).rejects.toThrow('Use KEY=VALUE or KEY with --value/--stdin, not both')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should import secrets from dotenv file', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    const envPath = path.join(tmpDir, '.env.local')

    await fs.promises.writeFile(envPath, 'FOO=bar\n# comment\nTOKEN="a=b"\n', 'utf8')

    try {
      await expect(
        importSecrets(envPath, {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toEqual(['FOO', 'TOKEN'])
      await expect(readFileValue(vaultPath, 'FOO')).resolves.toBe('bar')
      await expect(readFileValue(vaultPath, 'TOKEN')).resolves.toBe('a=b')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should import secrets from stdin', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()

    try {
      await expect(
        importSecrets(undefined, {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          readStdin: async () => 'FOO=bar',
          repoPath,
          runner: createRunner(repoPath),
          stdin: true,
        }),
      ).resolves.toEqual(['FOO'])
      await expect(readFileValue(vaultPath, 'FOO')).resolves.toBe('bar')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should reject import that overwrites existing keys by default', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    const envPath = path.join(tmpDir, '.env.local')

    await writeVaultValues(vaultPath, 'plain', {FOO: 'old'}, undefined)
    await fs.promises.writeFile(envPath, 'FOO=new\nBAR=baz\n', 'utf8')

    try {
      await expect(
        importSecrets(envPath, {
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).rejects.toThrow('Import would overwrite existing keys: FOO')
      await expect(readFileValue(vaultPath, 'FOO')).resolves.toBe('old')
      expect(await readFileValue(vaultPath, 'BAR')).toBeUndefined()
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should import with confirm-overwrite when overwrite is confirmed', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    const envPath = path.join(tmpDir, '.env.local')

    await writeVaultValues(vaultPath, 'plain', {FOO: 'old'}, undefined)
    await fs.promises.writeFile(envPath, 'FOO=new\nBAR=baz\n', 'utf8')

    try {
      await expect(
        importSecrets(envPath, {
          configPath,
          confirmOverwrite: true,
          cwd: tmpDir,
          prompt: createPrompt(true),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toEqual(['BAR', 'FOO'])
      await expect(readFileValue(vaultPath, 'FOO')).resolves.toBe('new')
      await expect(readFileValue(vaultPath, 'BAR')).resolves.toBe('baz')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should skip import when confirm-overwrite is declined', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    const envPath = path.join(tmpDir, '.env.local')

    await writeVaultValues(vaultPath, 'plain', {FOO: 'old'}, undefined)
    await fs.promises.writeFile(envPath, 'FOO=new\n', 'utf8')

    try {
      await expect(
        importSecrets(envPath, {
          configPath,
          confirmOverwrite: true,
          cwd: tmpDir,
          prompt: createPrompt(false),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toEqual([])
      await expect(readFileValue(vaultPath, 'FOO')).resolves.toBe('old')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should sync secrets to default export path', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    await writeVaultValues(vaultPath, 'plain', {FOO: 'bar'}, undefined)
    const exportPath = path.join(tmpDir, '.env.local')

    try {
      await expect(
        syncSecrets({
          configPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toEqual({
        exportPath,
        keyCount: 1,
        skipped: false,
      })
      await expect(fs.promises.readFile(exportPath, 'utf8')).resolves.toBe('FOO="bar"\n')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should sync secrets to configured export path', async () => {
    const {configPath, repoPath, tmpDir, vaultPath} = await createProject()
    const customConfigPath = path.join(tmpDir, 'custom.secret-vault.json')

    await fs.promises.writeFile(
      customConfigPath,
      JSON.stringify({
        exportPath: '.env.staging',
        namespace: 'app',
        repository: 'git@github.com:owner/vault.git',
        storage: 'plain',
      }),
      'utf8',
    )
    await writeVaultValues(vaultPath, 'plain', {TOKEN: 'secret'}, undefined)
    const exportPath = path.join(tmpDir, '.env.staging')

    try {
      await expect(
        syncSecrets({
          configPath: customConfigPath,
          cwd: tmpDir,
          prompt: createPrompt(),
          repoPath,
          runner: createRunner(repoPath),
        }),
      ).resolves.toEqual({
        exportPath,
        keyCount: 1,
        skipped: false,
      })
      await expect(fs.promises.readFile(exportPath, 'utf8')).resolves.toBe('TOKEN="secret"\n')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should skip sync when config is missing', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-sync-skip-'))

    try {
      await expect(
        syncSecrets({
          configPath: path.join(tmpDir, 'missing.secret-vault.json'),
          cwd: tmpDir,
          prompt: createPrompt(),
          runner: createRunner(path.join(tmpDir, 'repo')),
        }),
      ).resolves.toEqual({skipped: true})
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})

const readFileValue = async (vaultPath: string, key: string) => {
  const content = JSON.parse(await fs.promises.readFile(vaultPath, 'utf8')) as {
    values: Record<string, string>
  }

  return content.values[key]
}
