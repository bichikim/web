import {createHash, randomBytes} from 'node:crypto'

const TOKEN_BYTES = 32

export const createOpaqueToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url')

export const hashOpaqueToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')
