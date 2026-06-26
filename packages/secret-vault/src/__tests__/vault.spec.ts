import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {describe, expect, it} from 'vitest'
import {decryptValues, DEFAULT_SCRYPT_PARAMS, encryptValues} from '../crypto'
import {getVaultFilePath, readVaultValues, writeVaultValues} from '../vault'

describe('vault', () => {
  it('should resolve namespace vault file path', () => {
    expect(getVaultFilePath('/tmp/repo', 'my-app')).toBe(
      path.resolve('/tmp/repo', 'my-app', 'vault.json'),
    )
  })

  it('should reject vault paths outside the repository', () => {
    expect(() => getVaultFilePath('/tmp/repo', '..')).toThrow(
      'Vault path must stay inside the repository',
    )
  })

  it('should read and write plain vault values', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-plain-'))
    const vaultPath = getVaultFilePath(tmpDir, 'app')

    try {
      await writeVaultValues(vaultPath, 'plain', {foo: 'bar'}, undefined)

      await expect(readVaultValues(vaultPath, undefined)).resolves.toEqual({foo: 'bar'})
      expect((await fs.promises.stat(vaultPath)).mode.toString(8).slice(-3)).toBe('600')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should round trip encrypted vault values', async () => {
    const document = await encryptValues({foo: 'bar'}, 'passphrase')

    expect(document.storage).toBe('encrypted')
    expect(document.scryptParams).toEqual(DEFAULT_SCRYPT_PARAMS)
    expect(document.ciphertext).not.toContain('bar')
    await expect(decryptValues(document, 'passphrase')).resolves.toEqual({foo: 'bar'})
  })

  it('should decrypt legacy encrypted vault without scryptParams', async () => {
    const document = await encryptValues({foo: 'bar'}, 'passphrase')
    const legacyDocument = {
      authTag: document.authTag,
      ciphertext: document.ciphertext,
      iv: document.iv,
      kdf: document.kdf,
      salt: document.salt,
      storage: document.storage,
      version: document.version,
    }

    await expect(readVaultValuesFromDocument(legacyDocument, 'passphrase')).resolves.toEqual({
      foo: 'bar',
    })
  })

  it('should reject wrong passphrase', async () => {
    const document = await encryptValues({foo: 'bar'}, 'passphrase')

    await expect(decryptValues(document, 'wrong')).rejects.toThrow('Failed to decrypt vault')
  })

  it('should require passphrase for encrypted write', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-encrypted-'))

    try {
      await expect(
        writeVaultValues(getVaultFilePath(tmpDir, 'app'), 'encrypted', {foo: 'bar'}, undefined),
      ).rejects.toThrow('Encrypted vault requires a passphrase')
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })

  it('should reject invalid vault json', async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-invalid-json-'))
    const vaultPath = getVaultFilePath(tmpDir, 'app')

    await fs.promises.mkdir(path.dirname(vaultPath), {recursive: true})
    await fs.promises.writeFile(vaultPath, '{not-json', 'utf8')

    try {
      await expect(readVaultValues(vaultPath, undefined)).rejects.toThrow(
        `Vault file ${vaultPath} is not valid JSON`,
      )
    } finally {
      await fs.promises.rm(tmpDir, {force: true, recursive: true})
    }
  })
})

const readVaultValuesFromDocument = async (
  document: Record<string, unknown>,
  passphrase: string,
) => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secret-vault-legacy-'))
  const vaultPath = getVaultFilePath(tmpDir, 'app')

  try {
    await fs.promises.mkdir(path.dirname(vaultPath), {recursive: true})
    await fs.promises.writeFile(vaultPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')

    return readVaultValues(vaultPath, passphrase)
  } finally {
    await fs.promises.rm(tmpDir, {force: true, recursive: true})
  }
}
