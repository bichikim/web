import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {loadConfig, parseConfig, resolveConfigPath} from '../config'

describe('config', () => {
  it('should resolve default config path from cwd', () => {
    expect(resolveConfigPath({cwd: '/tmp/project'})).toBe('/tmp/project/.secret-vault.json')
  })

  it('should load config from override path', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-config-'))
    const configPath = path.join(tmpDir, 'custom.json')

    await fs.promises.writeFile(
      configPath,
      JSON.stringify({
        namespace: 'app',
        repository: 'git@github.com:owner/vault.git',
        storage: 'plain',
      }),
      'utf8',
    )

    try {
      await expect(loadConfig({configPath, cwd: tmpDir})).resolves.toEqual({
        configPath,
        exportPath: '.env.local',
        namespace: 'app',
        repository: 'git@github.com:owner/vault.git',
        storage: 'plain',
      })
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should default storage to encrypted', () => {
    expect(parseConfig({repository: 'git@github.com:owner/vault.git'})).toEqual({
      exportPath: undefined,
      repository: 'git@github.com:owner/vault.git',
      storage: undefined,
    })
  })

  it('should reject vaultPath config', () => {
    expect(() =>
      parseConfig({
        repository: 'git@github.com:owner/vault.git',
        vaultPath: 'vault.json',
      }),
    ).toThrow('vaultPath is not supported')
  })

  it('should reject invalid config json', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-config-invalid-'))
    const configPath = path.join(tmpDir, 'broken.json')

    await fs.promises.writeFile(configPath, '{not-json', 'utf8')

    try {
      await expect(loadConfig({configPath, cwd: tmpDir})).rejects.toThrow(
        `Config file ${configPath} is not valid JSON`,
      )
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should reject missing config file', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-config-missing-'))
    const configPath = path.join(tmpDir, 'missing.json')

    try {
      await expect(loadConfig({configPath, cwd: tmpDir})).rejects.toThrow(
        `Config file not found: ${configPath}`,
      )
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})
