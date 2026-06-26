import fs from 'node:fs'
import path from 'node:path'
import {
  decryptValues,
  type EncryptedVaultDocument,
  encryptValues,
  parseScryptParams,
} from './crypto'
import {SecretVaultError} from './errors'
import {parseJsonText} from './json'
import {writeSecretFile} from './secret-file'
import type {StorageMode, VaultValues} from './types'

export interface PlainVaultDocument {
  readonly storage: 'plain'
  readonly values: VaultValues
  readonly version: 1
}

export type VaultDocument = EncryptedVaultDocument | PlainVaultDocument

export const getVaultFilePath = (repoPath: string, namespace: string) => {
  const vaultPath = path.resolve(repoPath, namespace, 'vault.json')
  const repoRoot = `${path.resolve(repoPath)}${path.sep}`

  if (!vaultPath.startsWith(repoRoot)) {
    throw new SecretVaultError('Vault path must stay inside the repository')
  }

  return vaultPath
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parsePlainValues = (value: unknown): VaultValues => {
  if (!isRecord(value)) {
    throw new SecretVaultError('Plain vault values must be an object')
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeof entry !== 'string') {
        throw new SecretVaultError(`Plain vault value for ${key} must be a string`)
      }

      return [key, entry]
    }),
  )
}

const parseDocument = (value: unknown): VaultDocument => {
  if (!isRecord(value) || value.version !== 1) {
    throw new SecretVaultError('Vault document must be a version 1 object')
  }

  if (value.storage === 'plain') {
    return {
      storage: 'plain',
      values: parsePlainValues(value.values),
      version: 1,
    }
  }

  if (value.storage === 'encrypted') {
    if (typeof value.authTag !== 'string') {
      throw new SecretVaultError('Encrypted vault authTag must be a string')
    }

    if (typeof value.ciphertext !== 'string') {
      throw new SecretVaultError('Encrypted vault ciphertext must be a string')
    }

    if (typeof value.iv !== 'string') {
      throw new SecretVaultError('Encrypted vault iv must be a string')
    }

    if (typeof value.salt !== 'string') {
      throw new SecretVaultError('Encrypted vault salt must be a string')
    }

    if (value.kdf !== 'scrypt') {
      throw new SecretVaultError('Encrypted vault kdf must be scrypt')
    }

    return {
      authTag: value.authTag,
      ciphertext: value.ciphertext,
      iv: value.iv,
      kdf: 'scrypt',
      salt: value.salt,
      scryptParams: parseScryptParams(value.scryptParams),
      storage: 'encrypted',
      version: 1,
    }
  }

  throw new SecretVaultError('Vault storage must be "encrypted" or "plain"')
}

export const readVaultValues = async (
  filePath: string,
  passphrase: string | undefined,
): Promise<VaultValues> => {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const content = await fs.promises.readFile(filePath, 'utf8')
  const document = parseDocument(parseJsonText(content, `Vault file ${filePath}`))

  if (document.storage === 'plain') {
    return document.values
  }

  if (passphrase === undefined) {
    throw new SecretVaultError('Encrypted vault requires a passphrase')
  }

  return decryptValues(document, passphrase)
}

export const writeVaultValues = async (
  filePath: string,
  storage: StorageMode,
  values: VaultValues,
  passphrase: string | undefined,
) => {
  await fs.promises.mkdir(path.dirname(filePath), {recursive: true})

  if (storage === 'plain') {
    const document: PlainVaultDocument = {
      storage: 'plain',
      values,
      version: 1,
    }

    await writeSecretFile(filePath, `${JSON.stringify(document, null, 2)}\n`)

    return
  }

  if (passphrase === undefined) {
    throw new SecretVaultError('Encrypted vault requires a passphrase')
  }

  const document = await encryptValues(values, passphrase)

  await writeSecretFile(filePath, `${JSON.stringify(document, null, 2)}\n`)
}
