import crypto from 'node:crypto'
import {SecretVaultError} from './errors'
import type {VaultValues} from './types'

const KEY_LENGTH = 32
const SALT_LENGTH = 16
const IV_LENGTH = 12

export interface ScryptParams {
  readonly N: number
  readonly p: number
  readonly r: number
}

// AI_NOTE - Node scrypt defaults; stored in new vaults so KDF cost can be raised without breaking old files.
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 16384,
  p: 1,
  r: 8,
}

export interface EncryptedVaultDocument {
  readonly authTag: string
  readonly ciphertext: string
  readonly iv: string
  readonly kdf: 'scrypt'
  readonly salt: string
  readonly scryptParams: ScryptParams
  readonly storage: 'encrypted'
  readonly version: 1
}

const deriveKey = (passphrase: string, salt: Buffer, scryptParams: ScryptParams) =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(passphrase, salt, KEY_LENGTH, scryptParams, (error, derivedKey) => {
      if (error) {
        reject(error)

        return
      }

      resolve(derivedKey)
    })
  })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parsePositiveInteger = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new SecretVaultError(`Encrypted vault scryptParams.${field} must be a positive integer`)
  }

  return value
}

export const parseScryptParams = (value: unknown): ScryptParams => {
  if (value === undefined) {
    return DEFAULT_SCRYPT_PARAMS
  }

  if (!isRecord(value)) {
    throw new SecretVaultError('Encrypted vault scryptParams must be an object')
  }

  return {
    N: parsePositiveInteger(value.N, 'N'),
    p: parsePositiveInteger(value.p, 'p'),
    r: parsePositiveInteger(value.r, 'r'),
  }
}

export const encryptValues = async (
  values: VaultValues,
  passphrase: string,
): Promise<EncryptedVaultDocument> => {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const scryptParams = DEFAULT_SCRYPT_PARAMS
  const key = await deriveKey(passphrase, salt, scryptParams)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    scryptParams,
    storage: 'encrypted',
    version: 1,
  }
}

export const decryptValues = async (
  document: EncryptedVaultDocument,
  passphrase: string,
): Promise<VaultValues> => {
  try {
    const salt = Buffer.from(document.salt, 'base64')
    const iv = Buffer.from(document.iv, 'base64')
    const authTag = Buffer.from(document.authTag, 'base64')
    const ciphertext = Buffer.from(document.ciphertext, 'base64')
    const key = await deriveKey(passphrase, salt, document.scryptParams)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)

    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8',
    )
    const parsed = JSON.parse(plaintext) as unknown

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new SecretVaultError('Decrypted vault payload must be an object')
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => {
        if (typeof value !== 'string') {
          throw new SecretVaultError(`Decrypted vault value for ${key} must be a string`)
        }

        return [key, value]
      }),
    )
  } catch (error) {
    if (error instanceof SecretVaultError) {
      throw error
    }

    throw new SecretVaultError('Failed to decrypt vault; check the passphrase')
  }
}
