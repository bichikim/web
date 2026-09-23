import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto'
import {z} from 'zod'

const ALGORITHM = 'aes-256-gcm'
const INITIALIZATION_VECTOR_BYTES = 12
const KEY_BYTES = 32
const VERSION = 'v1'

export interface CalendarTokens {
  readonly accessToken: string
  readonly expiresAt: string | null
  readonly refreshToken: string | null
}

const calendarTokensSchema: z.ZodType<CalendarTokens> = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.iso.datetime().nullable(),
  refreshToken: z.string().min(1).nullable(),
})

export interface TokenVault {
  readonly open: (ciphertext: string) => CalendarTokens
  readonly seal: (tokens: CalendarTokens) => string
}

const readKey = (encodedKey: string): Buffer => {
  const key = Buffer.from(encodedKey, 'base64')

  if (key.byteLength !== KEY_BYTES || key.toString('base64') !== encodedKey) {
    throw new TypeError('POMO_CALENDAR_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }

  return key
}

/** Creates an authenticated token vault backed by AES-256-GCM. */
export const createTokenVault = (encodedKey: string): TokenVault => {
  const key = readKey(encodedKey)

  return {
    open: (ciphertext) => {
      try {
        const [version, initializationVectorValue, tagValue, encryptedValue] = ciphertext.split('.')

        if (
          version !== VERSION ||
          initializationVectorValue === undefined ||
          tagValue === undefined ||
          encryptedValue === undefined
        ) {
          throw new TypeError('Invalid calendar token ciphertext structure')
        }

        const decipher = createDecipheriv(
          ALGORITHM,
          key,
          Buffer.from(initializationVectorValue, 'base64url'),
        )
        decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
        const plaintext = Buffer.concat([
          decipher.update(Buffer.from(encryptedValue, 'base64url')),
          decipher.final(),
        ]).toString('utf8')

        return calendarTokensSchema.parse(JSON.parse(plaintext))
      } catch (cause: unknown) {
        throw new TypeError('Calendar token ciphertext is invalid', {cause})
      }
    },
    seal: (tokens) => {
      const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES)
      const cipher = createCipheriv(ALGORITHM, key, initializationVector)
      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(calendarTokensSchema.parse(tokens)), 'utf8'),
        cipher.final(),
      ])

      return [
        VERSION,
        initializationVector.toString('base64url'),
        cipher.getAuthTag().toString('base64url'),
        encrypted.toString('base64url'),
      ].join('.')
    },
  }
}
